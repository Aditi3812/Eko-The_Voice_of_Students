from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter(prefix="/api/v1/agent/matchmaker", tags=["matchmaker"])

class TelemetryToggleRequest(BaseModel):
    user_id: str
    course_id: str
    is_available: bool

@router.post("/toggle")
def toggle_availability(payload: TelemetryToggleRequest, db: Session = Depends(get_db)):
    # 1. Update or Insert student availability status in Neon
    query = text("""
        INSERT INTO user_telemetry (user_id, course_id, is_available, last_active)
        VALUES (:user_id, :course_id, :is_available, CURRENT_TIMESTAMP)
        ON CONFLICT (telemetry_id) DO NOTHING;
    """)
    db.execute(query, {"user_id": payload.user_id, "course_id": payload.course_id, "is_available": payload.is_available})
    db.commit()

    # 2. Check how many students are currently available for this course
    check_query = text("""
        SELECT COUNT(DISTINCT user_id) FROM user_telemetry 
        WHERE course_id = :course_id AND is_available = TRUE;
    """)
    count = db.execute(check_query, {"course_id": payload.course_id}).scalar()

    # If 2 or more users are active, trigger match state
    is_match = count >= 2 if payload.is_available else False

    return {
        "status": "logged",
        "available_count": count,
        "match_found": is_match,
        "message": f"⚡ Eko Match! {count} peers are ready to study together!" if is_match else "Status updated."
    }