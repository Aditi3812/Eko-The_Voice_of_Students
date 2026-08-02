from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from uuid import UUID
from app.core.security import verify_faculty_or_admin
from app.database import get_db
from app.models.user import User, Workspace, UserRole, WorkspaceType
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# --- Request / Response Pydantic Schemas ---
class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID
    full_name: str
    email: str
    role: UserRole
    is_school_email: bool


def determine_user_role(email: str) -> tuple[UserRole, bool]:
    """
    Determines role and school-email flag based on domain rules:
    - Anything ending in 'student.*.ac.in' or 'student.*.edu' -> STUDENT
    - Anything ending in '*.ac.in', '*.edu', '*.edu.in', '*.ac.uk' -> FACULTY
    - Others -> PERSONAL_USER
    """
    clean_email = email.lower().strip()
    domain = clean_email.split("@")[-1]

    # Student Domain Check (e.g., @student.rru.ac.in, @student.uni.ac.in)
    if "student." in domain or domain.startswith("student."):
        return UserRole.STUDENT, True

    # Faculty / Institutional Domain Check
    academic_tlds = [".edu", ".ac.in", ".edu.in", ".ac.uk"]
    if any(domain.endswith(tld) for tld in academic_tlds):
        return UserRole.FACULTY, True

    # General / Personal User
    return UserRole.PERSONAL_USER, False


@router.post("/signup", response_model=AuthResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    # 1. Check if user already exists
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )

    # 2. Determine exact Role & School Context from domain
    assigned_role, is_school = determine_user_role(payload.email)

    # 3. Create user record
    new_user = User(
        full_name=payload.full_name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=assigned_role,
        is_school_email=is_school,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 4. Create default workspace (SCHOOL for both STUDENT & FACULTY)
    default_ws_type = WorkspaceType.SCHOOL if is_school else WorkspaceType.PERSONAL
    default_ws_title = f"{payload.full_name}'s {'School' if is_school else 'Personal'} Space"
    
    workspace = Workspace(
        user_id=new_user.user_id,
        type=default_ws_type,
        title=default_ws_title
    )
    db.add(workspace)
    db.commit()

    # 5. Issue JWT Token
    token_data = {
        "sub": str(new_user.user_id),
        "email": new_user.email,
        "role": new_user.role.value if hasattr(new_user.role, 'value') else str(new_user.role),
        "is_school_email": new_user.is_school_email
    }
    access_token = create_access_token(data=token_data)

    return AuthResponse(
        access_token=access_token,
        user_id=new_user.user_id,
        full_name=new_user.full_name,
        email=new_user.email,
        role=new_user.role,
        is_school_email=new_user.is_school_email,
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token_data = {
        "sub": str(user.user_id),
        "email": user.email,
        "role": user.role.value if hasattr(user.role, 'value') else str(user.role),
        "is_school_email": user.is_school_email
    }
    access_token = create_access_token(data=token_data)

    return AuthResponse(
        access_token=access_token,
        user_id=user.user_id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        is_school_email=user.is_school_email,
    )