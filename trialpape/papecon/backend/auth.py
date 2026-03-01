"""
Industry-grade authentication helpers.

- bcrypt hashing
- Short-lived access JWT + long-lived refresh JWT
- Account-lockout after N failures
- Admin / role guard dependencies
"""

import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    MAX_FAILED_LOGIN_ATTEMPTS,
    LOCKOUT_MINUTES,
    ADMIN_ROLES,
    EMAIL_VERIFICATION_EXPIRE_HOURS,
    FEATURE_RBAC,
)
from database import get_db
from models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


# ── Password hashing ─────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── Token creation ────────────────────────────────────
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token() -> tuple[str, datetime]:
    """Return (token_string, expiry_datetime)."""
    token = secrets.token_urlsafe(64)
    expires = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return token, expires


# ── Email verification token ─────────────────────────
def create_email_verification_token() -> tuple[str, datetime]:
    """Return (token_string, expiry_datetime)."""
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=EMAIL_VERIFICATION_EXPIRE_HOURS)
    return token, expires


# ── Account lockout helpers ───────────────────────────
def is_account_locked(user: User) -> bool:
    if user.locked_until is None:
        return False
    now = datetime.now(timezone.utc)
    # PostgreSQL returns timezone-aware datetimes; handle both cases defensively
    locked = user.locked_until if user.locked_until.tzinfo else user.locked_until.replace(tzinfo=timezone.utc)
    return now < locked


def record_failed_login(user: User, db: Session) -> None:
    user.failed_login_attempts += 1
    if user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
        user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
    db.commit()


def reset_failed_login(user: User, db: Session) -> None:
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()


# ── FastAPI dependencies ──────────────────────────────
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        sub = payload.get("sub")
        if sub is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user_id = int(sub)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that restricts to admin-level roles (CEO)."""
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return current_user


def require_roles(allowed_roles: list[str]):
    """Dependency factory that restricts access to specific roles."""
    allowed = set(allowed_roles)

    def _require(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied for role '{current_user.role}'",
            )
        return current_user

    return _require


def require_feature(feature_key: str):
    """Dependency factory that enforces access by feature key from FEATURE_RBAC."""
    allowed = FEATURE_RBAC.get(feature_key)
    if not allowed:
        raise ValueError(f"Unknown feature key: {feature_key}")

    allowed_set = set(allowed)

    def _require(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_set:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied for role '{current_user.role}' on feature '{feature_key}'",
            )
        return current_user

    return _require
