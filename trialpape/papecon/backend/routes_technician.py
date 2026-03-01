from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from auth import require_feature
from controller_booking import (
    list_assigned_bookings_for_technician,
    get_booking_by_id,
    get_assignment_map_for_bookings,
    get_findings_map_for_bookings,
    get_appointment_type_map_for_bookings,
    get_assignment_for_technician,
    upsert_technician_findings,
    update_assignment_status,
)
from database import get_db
from models import User
from schemas import (
    BookingListResponse,
    BookingOut,
    TechnicianFindingsRequest,
    TechnicianStatusUpdateRequest,
)

router = APIRouter(prefix="/technician", tags=["technician"])


def _to_booking_out(booking, assignment, finding, technician_name: str, appointment_type: str | None = None) -> BookingOut:
    assignment_status = "cancelled" if booking.status == "cancelled" else (assignment.status if assignment else None)
    return BookingOut(
        id=booking.id,
        user_id=booking.user_id,
        service_date=booking.service_date,
        slot=booking.slot,
        pest_type=booking.pest_type,
        property_type=booking.property_type,
        address=booking.address,
        notes=booking.notes,
        status=booking.status,
        assigned_technician_user_id=assignment.technician_user_id if assignment else None,
        assigned_technician_name=technician_name,
        assigned_at=assignment.assigned_at if assignment else None,
        assignment_status=assignment_status,
        appointment_type=appointment_type,
        initial_findings=finding.findings if finding else None,
        assignment_updated_at=finding.updated_at if finding else None,
        created_at=booking.created_at,
    )


@router.get("/assignments", response_model=BookingListResponse)
def my_assignments(
    include_done: bool = Query(False, description="Include jobs marked done/completed"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.technician_portal")),
):
    bookings = list_assigned_bookings_for_technician(db, current_user.id)
    assignment_map = get_assignment_map_for_bookings(db, [b.id for b in bookings])
    findings_map = get_findings_map_for_bookings(db, [b.id for b in bookings])
    appointment_type_map = get_appointment_type_map_for_bookings(db, [b.id for b in bookings])

    if not include_done:
        done_statuses = {"done", "completed", "cancelled"}
        bookings = [
            b for b in bookings
            if b.status != "cancelled"
            and (
                (assignment_map.get(b.id) and assignment_map[b.id].status not in done_statuses)
                or not assignment_map.get(b.id)
            )
        ]

    payload = []
    for booking in bookings:
        assignment = assignment_map.get(booking.id)
        finding = findings_map.get(booking.id)
        appointment_type = appointment_type_map.get(booking.id, "inspection")
        payload.append(_to_booking_out(booking, assignment, finding, current_user.name, appointment_type))

    return {"bookings": payload, "total": len(payload)}


@router.post("/assignments/{booking_id}/findings", response_model=BookingOut)
def log_initial_findings(
    booking_id: int,
    body: TechnicianFindingsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.technician_portal")),
):
    assignment = get_assignment_for_technician(db, booking_id, current_user.id)
    booking = get_booking_by_id(db, booking_id)
    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cancelled bookings cannot be updated")

    finding = upsert_technician_findings(db, booking_id, current_user.id, body.findings)
    assignment = update_assignment_status(db, assignment, "inspection_logged")
    appointment_type = get_appointment_type_map_for_bookings(db, [booking_id]).get(booking_id, "inspection")

    return _to_booking_out(booking, assignment, finding, current_user.name, appointment_type)


@router.post("/assignments/{booking_id}/status", response_model=BookingOut)
def update_job_status(
    booking_id: int,
    body: TechnicianStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.technician_portal")),
):
    assignment = get_assignment_for_technician(db, booking_id, current_user.id)
    booking = get_booking_by_id(db, booking_id)
    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cancelled bookings cannot be updated")

    finding = get_findings_map_for_bookings(db, [booking_id]).get(booking_id)
    finding_text = (finding.findings if finding else "") or ""
    requires_findings = {
        "inspection_logged",
        "treatment_ongoing",
        "treatment_done",
        "done",
        "completed",
    }
    if body.status in requires_findings and not finding_text.strip():
        raise HTTPException(status_code=400, detail="Please save technician findings first before updating job status")

    assignment = update_assignment_status(db, assignment, body.status)

    appointment_type = get_appointment_type_map_for_bookings(db, [booking_id]).get(booking_id, "inspection")
    return _to_booking_out(booking, assignment, finding, current_user.name, appointment_type)
