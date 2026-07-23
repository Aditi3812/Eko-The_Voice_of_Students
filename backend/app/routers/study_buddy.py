import os
import traceback
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.vector_store import get_collection
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/v1/agent/study-buddy", tags=["study-buddy"])
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# 1. Define the actual tool function
def search_course_materials(query: str, course_id: str = "CSE-301") -> str:
    """Searches the student's vector database (ChromaDB) for relevant course slide chunks."""
    try:
        collection = get_collection(course_id)
        results = collection.query(query_texts=[query], n_results=3)
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]

        if not documents:
            return "No matching documents found in course materials."

        blocks = [
            f"[Page {m.get('page', 'N/A')} | Source: {m.get('source', 'Unknown')}]\n{d}" 
            for d, m in zip(documents, metadatas)
        ]
        return "\n\n".join(blocks)
    except Exception as e:
        return f"Error executing tool: {str(e)}"


class QueryRequest(BaseModel):
    course_id: str
    question: str


@router.post("/query")
async def query_study_buddy(payload: QueryRequest):
    try:
        # 1. Directly fetch vector chunks first
        context_str = search_course_materials(payload.question, payload.course_id)

        # 2. Single call to Gemini (Uses 1 request instead of 2!)
        prompt = f"COURSE CONTEXT:\n{context_str}\n\nSTUDENT QUESTION:\n{payload.question}"
        
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="You are Eko Study Buddy. Answer using provided context Only. If context not sufficient or incomplete ONLY reply 'I dont know."
            )
        )
        return {"answer": response.text, "mode": "Direct RAG"}

    except Exception as error:
        print("❌ CRITICAL STUDY BUDDY ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Study Buddy Error: {str(error)}")