import io
import os
from datetime import datetime
from typing import List, Optional
from uuid import UUID

import bcrypt
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import BaseModel
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.core.security import get_current_user, verify_faculty_or_admin
from app.database import get_db
from app.models import Department, Semester, Subject, Unit, UnitDocument, User, UserRole
from app.vector_store import get_unit_collection

# Single, unified router instance with prefix
router = APIRouter(prefix="/api/v1/classrooms", tags=["classrooms"])


# --- Pydantic Schemas ---
class DepartmentCreate(BaseModel):
    code: str
    name: str

class SemesterCreate(BaseModel):
    department_id: UUID
    semester_number: int
    academic_year: str

class SubjectCreate(BaseModel):
    semester_id: UUID
    subject_code: str
    title: str

class UnitCreate(BaseModel):
    subject_id: UUID
    unit_number: int
    title: str

class UnitDocumentResponse(BaseModel):
    document_id: UUID
    unit_id: UUID
    uploaded_by: Optional[UUID]
    file_name: str
    upload_type: str
    external_link: Optional[str]
    file_mime_type: Optional[str]
    file_size_bytes: Optional[int]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# --- Role Verification Helpers ---
def verify_admin(user: User = Depends(get_current_user)):
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create academic structures."
        )
    return user


# ==========================================
# 📖 READ (GET) ENDPOINTS
# ==========================================

@router.get("/departments")
def get_departments(db: Session = Depends(get_db)):
    return db.query(Department).all()

@router.get("/departments/{department_id}/semesters")
def get_semesters(department_id: UUID, db: Session = Depends(get_db)):
    return db.query(Semester).filter(Semester.department_id == department_id).all()

@router.get("/semesters/{semester_id}/subjects")
def get_subjects(semester_id: UUID, db: Session = Depends(get_db)):
    return db.query(Subject).filter(Subject.semester_id == semester_id).all()

@router.get("/subjects/{subject_id}/units")
def get_units(subject_id: UUID, db: Session = Depends(get_db)):
    return db.query(Unit).filter(Unit.subject_id == subject_id).all()

@router.get("/units/{unit_id}/documents", response_model=List[UnitDocumentResponse])
def get_unit_documents(unit_id: UUID, db: Session = Depends(get_db)):
    documents = db.query(UnitDocument).filter(UnitDocument.unit_id == unit_id).all()
    return documents


# ==========================================
# ✍️ CREATE (POST) ENDPOINTS (ADMIN ONLY)
# ==========================================

@router.post("/departments/create")
def create_department(
    payload: DepartmentCreate, 
    db: Session = Depends(get_db), 
    admin: User = Depends(verify_admin)
):
    dept = Department(code=payload.code, name=payload.name)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept

@router.post("/semesters/create")
def create_semester(
    payload: SemesterCreate, 
    db: Session = Depends(get_db), 
    admin: User = Depends(verify_admin)
):
    semester = Semester(
        department_id=payload.department_id,
        semester_number=payload.semester_number,
        academic_year=payload.academic_year
    )
    db.add(semester)
    db.commit()
    db.refresh(semester)
    return semester

@router.post("/subjects/create")
def create_subject(
    payload: SubjectCreate, 
    db: Session = Depends(get_db), 
    admin: User = Depends(verify_admin)
):
    subject = Subject(
        semester_id=payload.semester_id,
        subject_code=payload.subject_code,
        title=payload.title
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

@router.post("/units/create")
def create_unit(
    payload: UnitCreate, 
    db: Session = Depends(get_db), 
    admin: User = Depends(verify_admin)
):
    unit = Unit(
        subject_id=payload.subject_id,
        unit_number=payload.unit_number,
        title=payload.title
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


# ==========================================
# 📁 FILE & LINK UPLOAD TO POSTGRESQL (BLOB)
# ==========================================

@router.post("/units/upload-material")
async def upload_unit_material(
    unit_id: UUID = Form(...),
    file_name: str = Form(...),
    upload_type: str = Form(...),  # 'device' or 'link'
    external_link: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(verify_faculty_or_admin)
):
    db_binary_bytes = None
    mime_type = None
    file_size = 0
    extracted_text = ""

    if upload_type == "device":
        if not file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="File is required for device upload."
            )
        
        db_binary_bytes = await file.read()
        mime_type = file.content_type
        file_size = len(db_binary_bytes)

        if mime_type == "application/pdf" or file_name.lower().endswith(".pdf"):
            try:
                pdf_file = io.BytesIO(db_binary_bytes)
                reader = PdfReader(pdf_file)
                page_texts = []
                for idx, page in enumerate(reader.pages):
                    text = page.extract_text()
                    if text and text.strip():
                        page_texts.append(f"--- Page {idx + 1} ---\n{text}")
                extracted_text = "\n\n".join(page_texts)
            except Exception as e:
                print(f"Warning: Failed to extract text from PDF for embeddings: {e}")

    elif upload_type == "link":
        if not external_link:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="External link URL is required."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid upload_type specified."
        )

    collection_name = f"unit_{str(unit_id).lower().replace('-', '_')}"
    doc_record = UnitDocument(
        unit_id=unit_id,
        uploaded_by=user.user_id,
        file_name=file_name,
        upload_type=upload_type,
        file_data=db_binary_bytes,
        file_mime_type=mime_type,
        external_link=external_link,
        file_size_bytes=file_size,
        chroma_collection_name=collection_name
    )

    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    if extracted_text.strip():
        try:
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000, 
                chunk_overlap=150
            )
            chunks = text_splitter.split_text(extracted_text)

            collection = get_unit_collection(str(unit_id))

            documents_list = []
            metadatas_list = []
            ids_list = []

            for idx, chunk in enumerate(chunks):
                documents_list.append(chunk)
                metadatas_list.append({
                    "document_id": str(doc_record.document_id),
                    "file_name": file_name,
                    "unit_id": str(unit_id)
                })
                ids_list.append(f"{doc_record.document_id}_chunk_{idx}")

            collection.add(
                documents=documents_list,
                metadatas=metadatas_list,
                ids=ids_list
            )
        except Exception as e:
            print(f"Error adding vector embeddings to ChromaDB: {e}")

    return {
        "document_id": doc_record.document_id,
        "file_name": doc_record.file_name,
        "upload_type": doc_record.upload_type,
        "file_size_bytes": doc_record.file_size_bytes
    }


# ==========================================
# 📥 SERVE / DOWNLOAD FROM POSTGRESQL
# ==========================================

@router.get("/documents/{document_id}/download")
def download_document_from_db(document_id: UUID, db: Session = Depends(get_db)):
    doc = db.query(UnitDocument).filter(UnitDocument.document_id == document_id).first()
    
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    if doc.upload_type == "link":
        return {"external_link": doc.external_link}

    if not doc.file_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File binary data missing.")

    return Response(
        content=doc.file_data,
        media_type=doc.file_mime_type or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{doc.file_name}"'}
    )