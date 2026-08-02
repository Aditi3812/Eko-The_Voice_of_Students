import enum
from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    FACULTY = "FACULTY"
    STUDENT = "STUDENT"
    PERSONAL_USER = "PERSONAL_USER"


class WorkspaceType(str, enum.Enum):
    SCHOOL = "SCHOOL"
    PERSONAL = "PERSONAL"


class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    is_school_email = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class Workspace(Base):
    __tablename__ = "workspaces"

    workspace_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum(WorkspaceType), nullable=False)
    title = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)