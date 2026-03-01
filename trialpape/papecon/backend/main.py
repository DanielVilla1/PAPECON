"""
PAPECON Backend — FastAPI entry point.
Run:  python main.py   (or: uvicorn main:app --reload)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, SessionLocal, Base
from models import User  # noqa: F401 — ensures table is registered
from routes_auth import router as auth_router
from routes_admin import router as admin_router
from routes_booking import router as booking_router
from routes_booking_management import router as booking_management_router
from routes_technician import router as technician_router
from seed import seed

# ── Create tables ─────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Seed default accounts ─────────────────────────────
db = SessionLocal()
seed(db)
db.close()

# ── App ───────────────────────────────────────────────
app = FastAPI(title="PAPECON API", version="0.1.0")

# CORS — allow Vite dev server + Docker
import os
_cors_env = os.getenv("CORS_ORIGINS", "")
_cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()] if _cors_env else []
_cors_origins += [
    "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
    "http://localhost:5176", "http://localhost:5177", "http://127.0.0.1:5177",
    "http://localhost",       # Docker nginx on port 80
    "http://localhost:3000",  # alternate Docker port
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(_cors_origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(booking_router)
app.include_router(booking_management_router)
app.include_router(technician_router)


@app.get("/")
def root():
    return {"message": "PAPECON API is running"}


# ── Run ───────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
