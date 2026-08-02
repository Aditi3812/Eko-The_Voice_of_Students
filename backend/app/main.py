
import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.routers import ingest, notes, study_buddy, matchmaker, synthesizer, auth, classrooms
from fastapi.staticfiles import StaticFiles


from app.database import get_db

app = FastAPI(title="Eko Core Orchestrator API")
app.include_router(ingest.router)
app.include_router(notes.router)
app.include_router(study_buddy.router)
app.include_router(matchmaker.router)
app.include_router(synthesizer.router)
app.include_router(auth.router)
app.include_router(classrooms.router)

# Mount static files directory
uploads_dir = os.path.join(os.getcwd(), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Allow your local Next.js client to bypass browser CORS network blocks
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
