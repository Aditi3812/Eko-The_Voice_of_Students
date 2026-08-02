import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint, LargeBinary
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    department_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(100), nullable=False)

    # Relationships
    semesters = relationship("Semester", back_populates="department", cascade="all, delete-orphan")


class Semester(Base):
    __tablename__ = "semesters"

    semester_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.department_id", ondelete="CASCADE"), nullable=False)
    semester_number = Column(Integer, nullable=False)
    academic_year = Column(String(20), nullable=False)

    __table_args__ = (
        UniqueConstraint("department_id", "semester_number", name="uq_department_semester"),
    )

    # Relationships
    department = relationship("Department", back_populates="semesters")
    subjects = relationship("Subject", back_populates="semester", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    subject_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    semester_id = Column(UUID(as_uuid=True), ForeignKey("semesters.semester_id", ondelete="CASCADE"), nullable=False)
    subject_code = Column(String(20), nullable=False)
    title = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    semester = relationship("Semester", back_populates="subjects")
    units = relationship("Unit", back_populates="subject", cascade="all, delete-orphan")


class Unit(Base):
    __tablename__ = "units"

    unit_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.subject_id", ondelete="CASCADE"), nullable=False)
    unit_number = Column(Integer, nullable=False)
    title = Column(String(150), nullable=False)

    __table_args__ = (
        UniqueConstraint("subject_id", "unit_number", name="uq_subject_unit"),
    )

    # Relationships
    subject = relationship("Subject", back_populates="units")
    documents = relationship("UnitDocument", back_populates="unit", cascade="all, delete-orphan")


# ==========================================
# 📄 NEW: UNIT DOCUMENT MODEL (Database BLOB)
# ==========================================
class UnitDocument(Base):
    __tablename__ = "unit_documents"

    document_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    unit_id = Column(UUID(as_uuid=True), ForeignKey("units.unit_id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), nullable=False)
    
    file_name = Column(String(255), nullable=False)
    upload_type = Column(String(20), nullable=False) # 'device' or 'link'
    
    # 🗄️ Database Storage Fields:
    file_data = Column(LargeBinary, nullable=True) # Binary byte stream (PDF/Doc files directly stored in DB)
    file_mime_type = Column(String(100), nullable=True) # e.g. application/pdf
    external_link = Column(String(500), nullable=True) # For Google Drive / Web links
    
    file_size_bytes = Column(Integer, default=0)
    chroma_collection_name = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    unit = relationship("Unit", back_populates="documents")