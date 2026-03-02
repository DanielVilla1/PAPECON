import os
from dotenv import load_dotenv

load_dotenv()  # reads .env in the backend/ directory

# ── JWT ───────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "papecon-dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15            # short-lived access token
REFRESH_TOKEN_EXPIRE_DAYS = 7               # long-lived refresh token

# ── Database ──────────────────────────────────────────
# SQLite for local dev, PostgreSQL for GCP production.
# Set DATABASE_URL in .env to switch.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./papecon.db",
)

# ── Security ──────────────────────────────────────────
MAX_FAILED_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
EMAIL_VERIFICATION_EXPIRE_HOURS = 24

# ── Role configuration ────────────────────────────────
VALID_ROLES = [
    "ceo",
    "operations",
    "finance",
    "technical",
    "hr",
    "technician",
    "csr",
    "client",
    "developer",
]

# Roles that have admin/moderation powers
ADMIN_ROLES = ["ceo"]

# Roles a public visitor may self-register as
SELF_REGISTER_ROLES = ["client"]

# ── Feature-level RBAC matrix ───────────────────────
# Keys are feature identifiers used by backend route dependencies.
FEATURE_RBAC = {
    # CEO
    "management.user_account_management": ["ceo"],
    "management.formulate_pest_control_packages": ["ceo"],
    "finance.confirm_payments": ["ceo", "finance"],
    "finance.basic_audit_logging": ["ceo", "finance", "developer"],
    "analytics.executive_dashboard": ["ceo"],
    "analytics.package_and_price_insights": ["ceo"],

    # Operations
    "inventory.manage_resources": ["operations"],
    "service.plan_routes": ["operations"],
    "service.schedule_and_track_technicians": ["operations", "csr"],

    # Finance and Administration
    "finance.prepare_financial_reports": ["finance", "ceo"],
    "finance.manage_payroll": ["finance", "hr"],
    "finance.ensure_compliance": ["finance"],

    # Technical Supervisor
    "decision.review_customer_ratings": ["technical", "ceo"],
    "decision.formulate_optimal_treatments": ["technical"],

    # HR
    "hr.manage_employees": ["hr"],
    "hr.manage_hierarchy": ["hr"],
    "hr.organize_training": ["hr"],

    # Field Technicians
    "technician.log_initial_inspection": ["technician"],
    "technician.update_job_status": ["technician"],
    "technician.track_treatments": ["technician"],

    # CSR
    "csr.handle_inquiries": ["csr"],
    "csr.schedule_appointments": ["csr", "operations"],
    "csr.maintain_client_satisfaction": ["csr"],

    # Clients
    "client.create_and_access_accounts": ["client"],
    "client.inquire_and_request_bookings": ["client"],
    "client.track_job_status": ["client"],

    # Developer
    "developer.manage_system_architecture": ["developer"],
    "developer.manage_integrations": ["developer"],
    "developer.maintain_prophet_engine": ["developer"],
    "developer.view_technical_logs_and_health": ["developer", "ceo"],

    # Booking module (implemented)
    "booking.client_self_service": ["client"],
    "booking.management": ["operations", "csr"],
    "booking.schedule_appointments": ["operations", "csr"],
    "booking.assign_technician": ["operations"],
    "booking.technician_portal": ["technician"],
}

# ── Frontend URL (for verification links) ─────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5177")

# ── Email / SMTP ────────────────────────────────────
SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "")          # your Gmail address
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")      # Gmail App Password
SMTP_FROM     = os.getenv("SMTP_FROM", "")          # display "from" address (defaults to SMTP_USER)
