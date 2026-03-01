"""
Admin routes — user moderation, approval, and management.

Only accessible by users whose role is in ADMIN_ROLES (currently: CEO).
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import (
    UserAdminOut,
    AdminUserListResponse,
    RejectUserRequest,
    ChangeRoleRequest,
    MessageResponse,
)
from auth import require_admin
from config import VALID_ROLES
from email_service import send_approval_notification

router = APIRouter(prefix="/admin", tags=["admin"])


# ── List users (with optional filters) ───────────────
@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    status: Optional[str] = Query(None, description="Filter: pending | approved | rejected | unverified | all"),
    role: Optional[str] = Query(None, description="Filter by role, e.g. client"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = db.query(User)

    # ── Role filter ───────────────────────────────────
    if role:
        if role not in VALID_ROLES:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")
        query = query.filter(User.role == role)

    # ── Status filter ─────────────────────────────────
    if status == "pending":
        # Email verified but not yet approved / rejected
        query = query.filter(
            User.is_email_verified == True,
            User.is_approved == False,
            User.rejected_reason == None,
            User.is_active == True,
        )
    elif status == "approved":
        query = query.filter(User.is_approved == True)
    elif status == "rejected":
        query = query.filter(User.rejected_reason != None, User.is_approved == False)
    elif status == "unverified":
        query = query.filter(User.is_email_verified == False)
    # else: return all

    users = query.order_by(User.created_at.desc()).all()
    return {"users": users, "total": len(users)}


# ── Get single user detail ───────────────────────────
@router.get("/users/{user_id}", response_model=UserAdminOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── Approve user ──────────────────────────────────────
@router.post("/users/{user_id}/approve", response_model=MessageResponse)
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_approved:
        return {"message": f"{user.name} is already approved."}

    if not user.is_email_verified:
        raise HTTPException(status_code=400, detail="Cannot approve — user has not verified their email yet.")

    user.is_approved = True
    user.approved_by = admin.id
    user.approved_at = datetime.now(timezone.utc)
    user.rejected_reason = None  # clear any previous rejection
    db.commit()

    send_approval_notification(user.email, user.name, approved=True)
    return {"message": f"{user.name} has been approved and can now log in."}


# ── Reject user ───────────────────────────────────────
@router.post("/users/{user_id}/reject", response_model=MessageResponse)
def reject_user(
    user_id: int,
    body: RejectUserRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_approved = False
    user.rejected_reason = body.reason or "Registration rejected by administrator."
    user.is_active = False
    db.commit()

    send_approval_notification(user.email, user.name, approved=False, reason=body.reason)
    return {"message": f"{user.name}'s registration has been rejected."}


# ── Deactivate user ──────────────────────────────────
@router.post("/users/{user_id}/deactivate", response_model=MessageResponse)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")

    user.is_active = False
    user.refresh_token = None
    user.refresh_token_expires = None
    db.commit()
    return {"message": f"{user.name}'s account has been deactivated."}


# ── Reactivate user ──────────────────────────────────
@router.post("/users/{user_id}/activate", response_model=MessageResponse)
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    user.rejected_reason = None
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    return {"message": f"{user.name}'s account has been reactivated."}


# ── Change user role ──────────────────────────────────
@router.put("/users/{user_id}/role", response_model=MessageResponse)
def change_role(
    user_id: int,
    body: ChangeRoleRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot change your own role.")

    old_role = user.role
    user.role = body.role
    db.commit()
    return {"message": f"{user.name}'s role changed from {old_role} to {body.role}."}


# ── Unlock user (clear lockout) ──────────────────────
@router.post("/users/{user_id}/unlock", response_model=MessageResponse)
def unlock_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    return {"message": f"{user.name}'s account has been unlocked."}
