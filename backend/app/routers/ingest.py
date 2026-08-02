import io
import os
import traceback
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.database import get_db
from app.vector_store import get_unit_collection

router = APIRouter(prefix="/api/v1/course", tags=["ingestion"])


class IngestDocumentRequest(BaseModel):
    unit_id: str
    doc_id: str
    file_path: Optional[str] = None


@router.post("/ensure-ingested")
async def ensure_document_ingested(payload: IngestDocumentRequest, db: Session = Depends(get_db)):
    """
    Called when a user selects a document in the Workspace dropdown.
    Checks if ChromaDB already has vector chunks for this doc_id.
    If not, it processes the PDF and embeds it immediately.
    """
    try:
        collection = get_unit_collection(payload.unit_id)

        # 1. Check if document chunks are already in ChromaDB
        existing = collection.get(where={"document_id": payload.doc_id}, limit=1)
        if existing and existing.get("ids") and len(existing["ids"]) > 0:
            return {
                "status": "already_ingested",
                "message": f"Document {payload.doc_id} is ready for Study Buddy."
            }

        # 2. If file_path is provided or retrieved from DB, read and vectorize
        # (Replace this file resolution logic with your DB lookup if needed)
        pdf_path = payload.file_path or f"uploads/{payload.doc_id}.pdf"

        if not os.path.exists(pdf_path):
            raise HTTPException(
                status_code=404, 
                detail=f"PDF file for doc_id {payload.doc_id} not found on server at {pdf_path}."
            )

        reader = PdfReader(pdf_path)
        extracted_pages = []
        for idx, page in enumerate(reader.pages):
            text = page.extract_text()
            if text and text.strip():
                extracted_pages.append({"page": idx + 1, "text": text})

        if not extracted_pages:
            raise HTTPException(status_code=400, detail="PDF is empty or unreadable.")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        documents, metadatas, ids = [], [], []

        chunk_counter = 0
        for page_data in extracted_pages:
            chunks = text_splitter.split_text(page_data["text"])
            for chunk in chunks:
                documents.append(chunk)
                # CRITICAL: Save 'document_id' so Study Buddy where_clause matches!
                metadatas.append({
                    "document_id": payload.doc_id,
                    "file_name": os.path.basename(pdf_path),
                    "page": page_data["page"],
                    "unit_id": payload.unit_id
                })
                ids.append(f"{payload.doc_id}_chunk_{chunk_counter}")
                chunk_counter += 1

        collection.upsert(ids=ids, documents=documents, metadatas=metadatas)

        return {
            "status": "success",
            "message": f"Successfully auto-ingested {len(documents)} chunks into ChromaDB.",
            "chunks_processed": len(documents)
        }

    except Exception as error:
        print("❌ CRITICAL AUTO-INGESTION ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Auto-ingestion failed: {str(error)}")