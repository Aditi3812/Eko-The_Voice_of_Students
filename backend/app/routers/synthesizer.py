import os
import traceback
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/v1/agent/synthesizer", tags=["synthesizer"])
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class SynthesizeRequest(BaseModel):
    raw_html_notes: str

@router.post("/compile")
async def compile_study_guide(payload: SynthesizeRequest):
    try:
        system_instruction = (
            "You are Eko Synthesizer Agent. Take messy HTML notes written by students and restructure them "
            "into a beautifully structured, highly polished HTML study guide. "
            "Use clear headers (<h1>, <h2>), bullet points (<ul>, <li>), bold key terms, and code blocks (<pre><code>) if applicable. "
            "Return ONLY clean HTML body content without Markdown block wrappers like ```html."
        )

        prompt = f"RAW STUDENT NOTES:\n{payload.raw_html_notes}"

        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
            ),
        )

        # Clean up any potential markdown code fence wrappers from LLM output
        clean_html = response.text.replace("```html", "").replace("```", "").strip()

        return {"polished_html": clean_html}

    except Exception as error:
        print("❌ CRITICAL SYNTHESIZER ERROR:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Synthesizer Error: {str(error)}")