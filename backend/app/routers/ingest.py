import os
import shutil
import traceback
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.vector_store import get_collection

router = APIRouter(prefix="/api/v1/course", tags=["ingestion"])

UPLOAD_DIR = "./temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/ingest")
async def ingest_course_material(
    course_id: str = Form(...),
    file: UploadFile = File(...)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only standard PDF assets are supported.")

    temp_file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    try:
        # 1. Save inbound payload file
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 2. Extract Document pages
        loader = PyPDFLoader(temp_file_path)
        pages = loader.load()

        if not pages:
            raise HTTPException(status_code=400, detail="PDF appears to be empty or unreadable.")

        # 3. Chunk text recursively
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        split_docs = text_splitter.split_documents(pages)

        # 4. Format structure inputs
        documents = [doc.page_content for doc in split_docs]
        metadatas = [
            {"source": file.filename, "page": doc.metadata.get("page", 0) + 1, "course_id": course_id}
            for doc in split_docs
        ]
        ids = [f"{file.filename}_chunk_{index}" for index in range(len(split_docs))]

        # 5. Insert batches into persistent ChromaDB
        collection = get_collection(course_id)
        collection.upsert(ids=ids, documents=documents, metadatas=metadatas)

        return {
            "message": "Successfully embedded and indexed documents",
            "chunks_processed": len(documents),
            "source": file.filename
        }

    except Exception as error:
        # PRINT EXACT STACK TRACE IN TERMINAL FOR EASY DEBUGGING
        print("❌ CRITICAL INGESTION ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(error)}")
        
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)