"""
Authentication routes — login, register, verify email, refresh token.

Industry-level protections:
  • Strong password policy (validated by Pydantic schema)
  • Account lockout after 5 failed login attempts (15 min cooldown)
  • Email verification required before login
  • Admin approval required before login (except for seeded accounts)
  • Short-lived access token (15 min) + long-lived refresh token (7 days)
  • Timing-safe password comparison via passlib
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import (
    LoginRequest,
    RegisterRequest,
    RefreshTokenRequest,
    TokenPairResponse,
    MessageResponse,
    UserOut,
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_email_verification_token,
    get_current_user,
    is_account_locked,
    record_failed_login,
    reset_failed_login,
)
from config import SELF_REGISTER_ROLES
from email_service import send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Register ──────────────────────────────────────────
@router.post("/register", response_model=MessageResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    # Duplicate check
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Public self-registration is only allowed for "client" role
    role = "client"

    # Create email verification token
    ver_token, ver_expires = create_email_verification_token()

    user = User(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=role,
        is_email_verified=False,
        is_approved=False,
        email_verification_token=ver_token,
        email_verification_expires=ver_expires,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Send verification email (prints to console in dev mode)
    send_verification_email(body.email, body.name, ver_token)

    return {
        "message": (
            "Registration successful! A verification link has been sent to your email. "
            "After verifying your email, an administrator will review and approve your account."
        )
    }


# ── Verify email ─────────────────────────────────────
@router.get("/verify-email", response_model=MessageResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email_verification_token == token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    if user.is_email_verified:
        return {"message": "Email already verified. Awaiting admin approval."}

    # Check expiry
    now = datetime.now(timezone.utc)
    expires = user.email_verification_expires
    if expires:
        if not expires.tzinfo:
            expires = expires.replace(tzinfo=timezone.utc)
        if now > expires:
            raise HTTPException(
                status_code=400,
                detail="Verification link has expired. Please request a new one.",
            )

    user.is_email_verified = True
    user.email_verified_at = now
    user.email_verification_token = None
    user.email_verification_expires = None
    db.commit()

    return {"message": "Email verified successfully! Your account is now pending admin approval."}


# ── Resend verification email ─────────────────────────
@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(body: LoginRequest, db: Session = Depends(get_db)):
    """Resend verification email. Requires correct email + password to prevent abuse."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if user.is_email_verified:
        return {"message": "Email is already verified."}

    ver_token, ver_expires = create_email_verification_token()
    user.email_verification_token = ver_token
    user.email_verification_expires = ver_expires
    db.commit()

    send_verification_email(user.email, user.name, ver_token)
    return {"message": "A new verification link has been sent to your email."}


# ── Login ─────────────────────────────────────────────
@router.post("/login", response_model=TokenPairResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()

    # Generic message to avoid user-enumeration
    bad_creds = HTTPException(status_code=401, detail="Invalid email or password")

    if not user:
        raise bad_creds

    # ── Lockout check ─────────────────────────────────
    if is_account_locked(user):
        raise HTTPException(
            status_code=423,
            detail="Account temporarily locked due to too many failed attempts. Try again later.",
        )

    # ── Password check ────────────────────────────────
    if not verify_password(body.password, user.hashed_password):
        record_failed_login(user, db)
        remaining = MAX_FAILED_LOGIN_ATTEMPTS_VAL - user.failed_login_attempts
        if remaining <= 0:
            raise HTTPException(
                status_code=423,
                detail="Account locked due to too many failed attempts. Try again in 15 minutes.",
            )
        raise bad_creds

    # ── Active check ──────────────────────────────────
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account has been deactivated. Contact support.")

    # ── Email verified? ───────────────────────────────
    if not user.is_email_verified:
        raise HTTPException(
            status_code=403,
            detail="EMAIL_NOT_VERIFIED",
        )

    # ── Admin approved? ───────────────────────────────
    if not user.is_approved:
        raise HTTPException(
            status_code=403,
            detail="ACCOUNT_PENDING_APPROVAL",
        )

    # ── Success — reset lockout counter ───────────────
    reset_failed_login(user, db)

    # Issue token pair
    access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
    })
    refresh_tok, refresh_exp = create_refresh_token()
    user.refresh_token = refresh_tok
    user.refresh_token_expires = refresh_exp
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_tok,
    }


# ── Need the constant for lockout message ─────────────
from config import MAX_FAILED_LOGIN_ATTEMPTS as MAX_FAILED_LOGIN_ATTEMPTS_VAL


# ── Refresh token ─────────────────────────────────────
@router.post("/refresh", response_model=TokenPairResponse)
def refresh(body: RefreshTokenRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.refresh_token == body.refresh_token).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    # Check expiry
    now = datetime.now(timezone.utc)
    exp = user.refresh_token_expires
    if exp:
        if not exp.tzinfo:
            exp = exp.replace(tzinfo=timezone.utc)
        if now > exp:
            user.refresh_token = None
            user.refresh_token_expires = None
            db.commit()
            raise HTTPException(status_code=401, detail="Refresh token expired. Please log in again.")

    # Rotate: issue NEW token pair
    access_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
    })
    new_refresh, new_exp = create_refresh_token()
    user.refresh_token = new_refresh
    user.refresh_token_expires = new_exp
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": new_refresh,
    }


# ── Logout (invalidate refresh token) ────────────────
@router.post("/logout", response_model=MessageResponse)
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.refresh_token = None
    current_user.refresh_token_expires = None
    db.commit()
    return {"message": "Logged out successfully"}


# ── Get current user ─────────────────────────────────
@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
