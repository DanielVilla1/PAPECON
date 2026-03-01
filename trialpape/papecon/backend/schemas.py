import re
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List


# ── Password strength ────────────────────────────────
_PW_MIN_LEN = 8
_PW_RULES = [
    (r"[A-Z]", "at least one uppercase letter"),
    (r"[a-z]", "at least one lowercase letter"),
    (r"\d", "at least one digit"),
    (r"[!@#$%^&*(),.?\":{}|<>\-_=+\[\]\\;'/`~]", "at least one special character"),
]


def _validate_password_strength(password: str) -> str:
    errors: list[str] = []
    if len(password) < _PW_MIN_LEN:
        errors.append(f"at least {_PW_MIN_LEN} characters")
    for pattern, msg in _PW_RULES:
        if not re.search(pattern, password):
            errors.append(msg)
    if errors:
        raise ValueError("Password must contain: " + "; ".join(errors))
    return password


# ── Auth requests ─────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def strong_password(cls, v):
        return _validate_password_strength(v)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v):
        if not v or not v.strip():
            raise ValueError("Name is required")
        return v.strip()


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ── Auth responses ────────────────────────────────────
class TokenPairResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str


# ── User views ────────────────────────────────────────
class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str

    class Config:
        from_attributes = True


class UserAdminOut(BaseModel):
    """Extended user view for admin moderation panels."""
    id: int
    name: str
    email: str
    role: str
    is_email_verified: bool
    is_approved: bool
    is_active: bool
    rejected_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    email_verified_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Admin actions ─────────────────────────────────────
class ApproveUserRequest(BaseModel):
    pass  # body can be empty; user id comes from path


class RejectUserRequest(BaseModel):
    reason: Optional[str] = "Registration rejected by administrator."


class ChangeRoleRequest(BaseModel):
    role: str


class AdminUserListResponse(BaseModel):
    users: List[UserAdminOut]
    total: int


# ── Booking module ───────────────────────────────────
class SlotAvailabilityOut(BaseModel):
    slot: str
    available: bool


class SlotAvailabilityResponse(BaseModel):
    service_date: date
    slots: List[SlotAvailabilityOut]


class BookingCreateRequest(BaseModel):
    service_date: date
    slot: str
    pest_type: str
    property_type: str
    address: str
    notes: Optional[str] = None

    @field_validator("slot")
    @classmethod
    def slot_not_blank(cls, v):
        if not v or not v.strip():
            raise ValueError("Slot is required")
        return v.strip()

    @field_validator("pest_type", "property_type", "address")
    @classmethod
    def required_text(cls, v):
        if not v or not v.strip():
            raise ValueError("This field is required")
        return v.strip()


class BookingOut(BaseModel):
    id: int
    user_id: int
    service_date: date
    slot: str
    pest_type: str
    property_type: str
    address: str
    notes: Optional[str] = None
    status: str
    assigned_technician_user_id: Optional[int] = None
    assigned_technician_name: Optional[str] = None
    assigned_at: Optional[datetime] = None
    assignment_status: Optional[str] = None
    initial_findings: Optional[str] = None
    assignment_updated_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BookingListResponse(BaseModel):
    bookings: List[BookingOut]
    total: int


class AssignTechnicianRequest(BaseModel):
    technician_user_id: int


class TechnicianOut(BaseModel):
    id: int
    name: str
    email: str


class TechnicianListResponse(BaseModel):
    technicians: List[TechnicianOut]
    total: int


class TechnicianFindingsRequest(BaseModel):
    findings: str

    @field_validator("findings")
    @classmethod
    def findings_not_blank(cls, v):
        if not v or not v.strip():
            raise ValueError("Findings are required")
        return v.strip()


class TechnicianStatusUpdateRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def status_allowed(cls, v):
        allowed = {"assigned", "inspection_logged", "treatment_done", "done", "completed"}
        if v not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(sorted(allowed))}")
        return v
