

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.routers import ingest, notes, study_buddy, matchmaker, synthesizer



from app.database import get_db

app = FastAPI(title="Eko Core Orchestrator API")
app.include_router(ingest.router)
app.include_router(notes.router)
app.include_router(study_buddy.router)
app.include_router(matchmaker.router)
app.include_router(synthesizer.router)

# Allow your local Next.js client to bypass browser CORS network blocks
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inbound validation schema 
# pydantic schema
class LoginRequest(BaseModel):
    user_id: str
    name: str
    email: EmailStr

@app.post("/api/v1/auth/login")#app is frontend.This defines the endpoint. When the frontend sends a POST request to this URL, FastAPI captures it.
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    # Check if user already exists in Neon PostgreSQL
    # We execute raw validation checks against our table parameters
    user_exists = db.execute(
        text(f"SELECT user_id FROM users WHERE user_id = '{payload.user_id}'")
    ).fetchone()

    if not user_exists:
        # Fallback insert statement if a user registers for the first time
        db.execute(
            text(f"INSERT INTO users (user_id, name, email) VALUES ('{payload.user_id}', '{payload.name}', '{payload.email}')")
        )
        db.commit()

    return {"status": "authenticated", "user_id": payload.user_id, "scope": "eko_workspace"}

