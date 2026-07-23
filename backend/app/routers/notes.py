from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.websocket_manager import manager

#This handles both real-time typing sync via WebSocket and auto-saving to Neon.
router = APIRouter(prefix="/api/v1/notes", tags=["notes"])

class SaveNoteRequest(BaseModel):
    note_id: str
    course_id: str
    content: str

# --- REST ENDPOINT: Save Note to Neon ---
@router.post("/save")
def save_note(payload: SaveNoteRequest, db: Session = Depends(get_db)):
    query = text("""
        INSERT INTO collaborative_notes (note_id, course_id, content, last_updated)
        VALUES (:note_id, :course_id, :content, CURRENT_TIMESTAMP)
        ON CONFLICT (note_id) 
        DO UPDATE SET content = :content, last_updated = CURRENT_TIMESTAMP;
    """)
    db.execute(query, {"note_id": payload.note_id, "course_id": payload.course_id, "content": payload.content})
    db.commit()
    return {"status": "success", "note_id": payload.note_id}

# --- REST ENDPOINT: Load Note from Neon ---
@router.get("/{note_id}")
def get_note(note_id: str, db: Session = Depends(get_db)):
    query = text("SELECT note_id, course_id, content FROM collaborative_notes WHERE note_id = :note_id")
    result = db.execute(query, {"note_id": note_id}).fetchone()
    if not result:
        return {"note_id": note_id, "course_id": "CSE-301", "content": "# Unit 3: Graph Theory & Paths\n\nStart typing notes here..."}
    return {"note_id": result.note_id, "course_id": result.course_id, "content": result.content}

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