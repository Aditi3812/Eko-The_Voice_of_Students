from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import UUID
from typing import Optional

from app.database import get_db
from app.websocket_manager import manager

router = APIRouter(prefix="/api/v1/notes", tags=["notes"])


class SaveNoteRequest(BaseModel):
    note_id: str
    unit_id: Optional[str] = None
    owner_id: Optional[str] = None
    title: Optional[str] = "Untitled Note"
    content: str  # Maps to content_html in DB


# --- REST ENDPOINT: Save Note to Database ---
import uuid
from uuid import UUID

@router.post("/save")
def save_note(payload: SaveNoteRequest, db: Session = Depends(get_db)):
    # Convert string to deterministic UUID if it contains prefixes like 'unit_note_'
    try:
        note_uuid = UUID(payload.note_id)
    except ValueError:
        # Generates a consistent, valid UUID for non-standard room string IDs
        note_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, payload.note_id)

    unit_uuid = None
    if payload.unit_id:
        try:
            unit_uuid = UUID(payload.unit_id)
        except ValueError:
            pass

    owner_uuid = None
    if payload.owner_id:
        try:
            owner_uuid = UUID(payload.owner_id)
        except ValueError:
            pass

    query = text("""
        INSERT INTO notes (note_id, unit_id, owner_id, title, content_html, last_updated)
        VALUES (:note_id, :unit_id, :owner_id, :title, :content_html, CURRENT_TIMESTAMP)
        ON CONFLICT (note_id) 
        DO UPDATE SET 
            content_html = EXCLUDED.content_html,
            title = COALESCE(EXCLUDED.title, notes.title),
            last_updated = CURRENT_TIMESTAMP;
    """)

    db.execute(
        query,
        {
            "note_id": note_uuid,
            "unit_id": unit_uuid,
            "owner_id": owner_uuid,
            "title": payload.title,
            "content_html": payload.content,
        },
    )
    db.commit()
    return {"status": "success", "note_id": str(note_uuid)}

# --- REST ENDPOINT: Load Note from Database ---
@router.get("/{note_id}")
def get_note(note_id: str, db: Session = Depends(get_db)):
    # Check if note_id is a valid UUID
    try:
        valid_uuid = UUID(note_id)
    except ValueError:
        # Fallback response for mock room IDs or non-UUID route parameters
        return {
            "note_id": note_id,
            "unit_id": None,
            "title": "Unit 3: Graph Theory & Paths",
            "content": "# Unit 3: Graph Theory & Paths\n\nStart typing notes here...",
        }

    query = text("""
        SELECT note_id, unit_id, owner_id, title, content_html 
        FROM notes 
        WHERE note_id = :note_id
    """)
    result = db.execute(query, {"note_id": valid_uuid}).fetchone()

    if not result:
        return {
            "note_id": str(valid_uuid),
            "unit_id": None,
            "title": "Unit 3: Graph Theory & Paths",
            "content": "# Unit 3: Graph Theory & Paths\n\nStart typing notes here...",
        }

    return {
        "note_id": str(result.note_id),
        "unit_id": str(result.unit_id) if result.unit_id else None,
        "owner_id": str(result.owner_id) if result.owner_id else None,
        "title": result.title or "Untitled Note",
        "content": result.content_html or "",
    }


# --- WEBSOCKET ENDPOINT: Real-time Live Typing Broadcast ---
@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    try:
        while True:
            # Wait for typing data from client
            data = await websocket.receive_text()
            # Broadcast immediately to all other users in room
            await manager.broadcast(data, websocket, room_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)