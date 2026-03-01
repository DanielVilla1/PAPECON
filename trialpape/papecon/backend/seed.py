"""Seed the database with one test account per role.

All seeded accounts are pre-verified and pre-approved so they can log in
immediately during development / testing.
"""

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models import User
from auth import hash_password
from config import VALID_ROLES

SEED_PASSWORD = "Password123!"

SEED_USERS = [
    {"name": "CEO User",              "email": "ceo@papecon.com",        "role": "ceo"},
    {"name": "Operations Manager",    "email": "operations@papecon.com", "role": "operations"},
    {"name": "Finance Admin Manager", "email": "finance@papecon.com",    "role": "finance"},
    {"name": "Technical Supervisor",  "email": "technical@papecon.com",  "role": "technical"},
    {"name": "HR Manager",            "email": "hr@papecon.com",         "role": "hr"},
    {"name": "Field Technician",      "email": "technician@papecon.com", "role": "technician"},
    {"name": "Customer Service Rep",  "email": "csr@papecon.com",        "role": "csr"},
    {"name": "Client User",           "email": "client@papecon.com",     "role": "client"},
    {"name": "Developer User",        "email": "developer@papecon.com",  "role": "developer"},
]


def seed(db: Session):
    """Insert seed users if the table is empty."""
    if db.query(User).count() > 0:
        print("  ⏩  Users table already has data — skipping seed.")
        return

    print("  🌱  Seeding test accounts...")
    now = datetime.now(timezone.utc)
    hashed = hash_password(SEED_PASSWORD)
    for u in SEED_USERS:
        db.add(User(
            name=u["name"],
            email=u["email"],
            hashed_password=hashed,
            role=u["role"],
            is_email_verified=True,
            email_verified_at=now,
            is_approved=True,
            approved_at=now,
            is_active=True,
        ))
    db.commit()
    print(f"  ✅  {len(SEED_USERS)} accounts seeded (password: {SEED_PASSWORD})")
    print("       All accounts are pre-verified and pre-approved.")
