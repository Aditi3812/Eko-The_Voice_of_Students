import os
import traceback
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

from app.vector_store import get_unit_collection

load_dotenv()

router = APIRouter(prefix="/api/v1/agent/study-buddy", tags=["study-buddy"])

# Initialize Gemini client safely
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None


class QueryRequest(BaseModel):
    unit_id: Optional[str] = None
    doc_id: Optional[str] = None
    question: str


def search_unit_materials(query: str, unit_id: Optional[str] = None, doc_id: Optional[str] = None) -> str:
    """Searches ChromaDB vector collection for relevant course material chunks within a unit."""
    # Ensure unit_id has a safe fallback string
    target_unit = unit_id if (unit_id and unit_id != "null" and unit_id != "undefined") else "default_unit"

    try:
        collection = get_unit_collection(target_unit)
        if not collection:
            return "No vector collection found for this unit."

        # Build clean metadata filter
        where_clause = None
        if doc_id and doc_id not in ("null", "undefined", ""):
            where_clause = {"document_id": str(doc_id)}

        results = collection.query(
            query_texts=[query],
            n_results=3,
            where=where_clause
        )

        documents = results.get("documents", [[]])[0] if results else []
        metadatas = results.get("metadatas", [[]])[0] if results else []

        if not documents:
            return "No matching documents found in course materials."

        blocks = []
        for d, m in zip(documents, metadatas):
            doc_name = m.get("file_name", "Document") if isinstance(m, dict) else "Document"
            blocks.append(f"[Source: {doc_name}]\n{d}")

        return "\n\n".join(blocks)
    except Exception as e:
        print(f"⚠️ Vector Query Warning: {str(e)}")
        return f"Note: Could not retrieve vector context ({str(e)})."


@router.post("/query")
async def query_study_buddy(payload: QueryRequest):
    try:
        if not client:
            raise HTTPException(
                status_code=500, 
                detail="GEMINI_API_KEY is missing from server environment."
            )

        # 1. Retrieve relevant vector context from ChromaDB
        context_str = search_unit_materials(
            query=payload.question, 
            unit_id=payload.unit_id, 
            doc_id=payload.doc_id
        )

        # 2. Single call to Gemini with context prompt
        prompt = f"COURSE CONTEXT:\n{context_str}\n\nSTUDENT QUESTION:\n{payload.question}"

        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are Eko Study Buddy, an intelligent AI tutor. "
                    "Answer using the provided course context. "
                    "If the context is not sufficient or incomplete, reply 'I don't know based on the provided material.'"
                )
            )
        )

        response_text = response.text if hasattr(response, 'text') else "No response generated."

        return {"answer": response_text, "mode": "Direct RAG"}

    except Exception as error:
        print("❌ CRITICAL STUDY BUDDY ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Study Buddy Error: {str(error)}")