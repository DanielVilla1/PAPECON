# PAPECON Backend
# This is just a Test
FastAPI backend for the PAPECON Pest Control Management System.

## Quick Start

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Server runs at `http://localhost:8000`.

If you run with Docker, backend code changes now auto-reload inside the container.

First run (or after dependency changes):

```bash
cd ..
docker compose up -d --build backend
```

Normal code-only edits (no rebuild needed):

```bash
cd ..
docker compose up -d backend
```

## RBAC Update Requirement

When adding any new feature (pages, endpoints, or modules), update RBAC in the same change:

- Frontend: protect routes in `src/routes/AppRouter.jsx` using `ProtectedRoute` with explicit roles.
- Backend: enforce role checks in route dependencies (prefer `require_feature("feature.key")`).
- Navigation: only expose links in `src/config/roleNav.js` for roles that are allowed.

### Whole-system RBAC mapping (required for all new features)

- Canonical backend feature matrix: `backend/config.py` → `FEATURE_RBAC`
- Canonical frontend feature matrix: `src/config/rbacMap.js` → `FEATURE_RBAC`
- Backend feature guard helper: `backend/auth.py` → `require_feature(feature_key)`

For each new feature you add later:

1. Add a feature key in both RBAC maps.
2. Apply backend guard with `require_feature("your.feature_key")` on endpoints.
3. Apply frontend route guard (`ProtectedRoute`) and align menu visibility (`roleNav`).
4. Verify expected role = `200`, non-allowed role = `403`.

### Booking workflow role relation (implemented)

- Client: creates booking request (`/bookings/*`)
- Customer Service Representative (CSR): handles inquiries and schedules appointments (`/booking-management/bookings`, `/booking-management/slots`, `/booking-management/bookings/{id}/reschedule`)
- Operations Manager: schedules, assigns, and tracks technician jobs (`/booking-management/bookings`, `/booking-management/slots`, `/booking-management/bookings/{id}/reschedule`, `/booking-management/bookings/{id}/assign`)
- Schedule appointment roles: Operations + CSR (`booking.schedule_appointments`)
- Assignment-capable roles: Operations only (`/booking-management/bookings/{id}/assign`)
- Technician: receives assigned schedule (`/technician/assignments`), logs initial findings (`/technician/assignments/{id}/findings`), and updates treatment status (`/technician/assignments/{id}/status`)
- Technician UX behavior: jobs marked `done` are removed from **My Assignments** and remain visible in **Field Report** history

## Seeded Test Accounts

All passwords are `Password123!`

| Role | Email |
|---|---|
| CEO | ceo@papecon.com |
| Operations Manager | operations@papecon.com |
| Finance & Admin | finance@papecon.com |
| Technical Supervisor | technical@papecon.com |
| HR Manager | hr@papecon.com |
| Field Technician | technician@papecon.com |
| Customer Service Rep | csr@papecon.com |
| Client | client@papecon.com |
| Developer | developer@papecon.com |