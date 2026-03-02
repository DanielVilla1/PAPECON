from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from auth import require_feature
from controller_booking import (
    get_slot_availability,
    create_booking,
    list_user_bookings,
    get_booking_for_user,
    confirm_booking,
    cancel_booking,
    get_assignment_map_for_bookings,
    get_findings_map_for_bookings,
    get_appointment_type_map_for_bookings,
)
from database import get_db
from models import User
from schemas import (
    SlotAvailabilityResponse,
    BookingCreateRequest,
    BookingCancelRequest,
    BookingOut,
    BookingListResponse,
)

router = APIRouter(prefix="/bookings", tags=["bookings"])


def _to_booking_out(booking, assignment=None, finding=None, technician_name=None, appointment_type=None):
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


@router.get("/slots", response_model=SlotAvailabilityResponse)
def check_slots(
    service_date: date = Query(..., description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.client_self_service")),
):
    slots = get_slot_availability(db, service_date)
    return {"service_date": service_date, "slots": slots}


@router.get("", response_model=BookingListResponse)
def my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.client_self_service")),
):
    bookings = list_user_bookings(db, current_user.id)
    assignment_map = get_assignment_map_for_bookings(db, [b.id for b in bookings])
    finding_map = get_findings_map_for_bookings(db, [b.id for b in bookings])
    appointment_type_map = get_appointment_type_map_for_bookings(db, [b.id for b in bookings])

    technician_ids = {
        assignment.technician_user_id
        for assignment in assignment_map.values()
        if assignment and assignment.technician_user_id
    }
    technicians = {}
    if technician_ids:
        tech_rows = db.query(User).filter(User.id.in_(list(technician_ids))).all()
        technicians = {tech.id: tech.name for tech in tech_rows}

    payload = []
    for booking in bookings:
        assignment = assignment_map.get(booking.id)
        finding = finding_map.get(booking.id)
        appointment_type = appointment_type_map.get(booking.id, "inspection")
        technician_name = technicians.get(assignment.technician_user_id) if assignment else None
        payload.append(_to_booking_out(booking, assignment, finding, technician_name, appointment_type))

    return {"bookings": payload, "total": len(payload)}


@router.post("", response_model=BookingOut, status_code=201)
def create_booking_route(
    body: BookingCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.client_self_service")),
):
    booking = create_booking(
        db=db,
        user_id=current_user.id,
        service_date=body.service_date,
        slot=body.slot,
        pest_type=body.pest_type,
        property_type=body.property_type,
        address=body.address,
        notes=body.notes,
    )
    return _to_booking_out(booking, appointment_type="inspection")


@router.post("/{booking_id}/confirm", response_model=BookingOut)
def confirm_booking_route(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.client_self_service")),
):
    booking = get_booking_for_user(db, booking_id, current_user.id)
    booking = confirm_booking(db, booking)
    assignment = get_assignment_map_for_bookings(db, [booking.id]).get(booking.id)
    finding = get_findings_map_for_bookings(db, [booking.id]).get(booking.id)
    appointment_type = get_appointment_type_map_for_bookings(db, [booking.id]).get(booking.id, "inspection")
    tech_name = None
    if assignment:
        technician = db.query(User).filter(User.id == assignment.technician_user_id).first()
        tech_name = technician.name if technician else None
    return _to_booking_out(booking, assignment, finding, tech_name, appointment_type)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking_route(
    booking_id: int,
    body: BookingCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.client_self_service")),
):
    booking = get_booking_for_user(db, booking_id, current_user.id)
    reason_label_map = {
        "schedule_conflict": "Schedule conflict",
        "price_concern": "Price concern",
        "service_no_longer_needed": "Service no longer needed",
        "booked_by_mistake": "Booked by mistake",
        "location_unavailable": "Location unavailable",
        "other": "Other",
    }
    reason_text = reason_label_map.get(body.reason_code, body.reason_code)
    if body.reason_details:
        reason_text = f"{reason_text} - {body.reason_details.strip()}"
    booking = cancel_booking(db, booking, reason_text)
    assignment = get_assignment_map_for_bookings(db, [booking.id]).get(booking.id)
    finding = get_findings_map_for_bookings(db, [booking.id]).get(booking.id)
    appointment_type = get_appointment_type_map_for_bookings(db, [booking.id]).get(booking.id, "inspection")
    tech_name = None
    if assignment:
        technician = db.query(User).filter(User.id == assignment.technician_user_id).first()
        tech_name = technician.name if technician else None
    return _to_booking_out(booking, assignment, finding, tech_name, appointment_type)
