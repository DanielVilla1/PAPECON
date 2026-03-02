from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import require_feature
from controller_booking import (
    list_all_bookings,
    list_technicians,
    get_assignment_map_for_bookings,
    get_findings_map_for_bookings,
    get_appointment_type_map_for_bookings,
    get_slot_availability,
    get_booking_by_id,
    assign_technician,
    confirm_booking,
    cancel_booking,
    reschedule_booking,
)
from database import get_db
from models import User
from email_service import send_booking_schedule_update
from schemas import (
    BookingListResponse,
    BookingOut,
    AssignTechnicianRequest,
    BookingCancelRequest,
    TechnicianListResponse,
    SlotAvailabilityResponse,
    BookingRescheduleRequest,
)
from datetime import date

router = APIRouter(prefix="/booking-management", tags=["booking-management"])


def _to_booking_out(booking, assignment=None, finding=None, technician_name=None, appointment_type=None) -> BookingOut:
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


@router.get("/bookings", response_model=BookingListResponse)
def list_bookings_for_management(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.management")),
):
    bookings = list_all_bookings(db)
    assignment_map = get_assignment_map_for_bookings(db, [b.id for b in bookings])
    findings_map = get_findings_map_for_bookings(db, [b.id for b in bookings])
    appointment_type_map = get_appointment_type_map_for_bookings(db, [b.id for b in bookings])
    technicians = {u.id: u for u in list_technicians(db)}

    payload = []
    for booking in bookings:
        assignment = assignment_map.get(booking.id)
        finding = findings_map.get(booking.id)
        appointment_type = appointment_type_map.get(booking.id, "inspection")
        tech = technicians.get(assignment.technician_user_id) if assignment else None
        payload.append(_to_booking_out(booking, assignment, finding, tech.name if tech else None, appointment_type))

    return {"bookings": payload, "total": len(payload)}


@router.get("/technicians", response_model=TechnicianListResponse)
def technicians_for_assignment(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.management")),
):
    technicians = list_technicians(db)
    payload = [{"id": t.id, "name": t.name, "email": t.email} for t in technicians]
    return {"technicians": payload, "total": len(payload)}


@router.get("/slots", response_model=SlotAvailabilityResponse)
def management_slot_availability(
    service_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.schedule_appointments")),
):
    slots = get_slot_availability(db, service_date)
    return {"service_date": service_date, "slots": slots}


@router.post("/bookings/{booking_id}/assign", response_model=BookingOut)
def assign_booking_technician(
    booking_id: int,
    body: AssignTechnicianRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.assign_technician")),
):
    booking = get_booking_by_id(db, booking_id)
    assignment = assign_technician(
        db=db,
        booking=booking,
        technician_user_id=body.technician_user_id,
        assigned_by_user_id=current_user.id,
    )

    technician = db.query(User).filter(User.id == assignment.technician_user_id).first()
    finding = get_findings_map_for_bookings(db, [booking_id]).get(booking_id)
    appointment_type = get_appointment_type_map_for_bookings(db, [booking_id]).get(booking_id, "inspection")
    return _to_booking_out(booking, assignment, finding, technician.name if technician else None, appointment_type)


@router.post("/bookings/{booking_id}/confirm", response_model=BookingOut)
def confirm_booking_for_management(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.management")),
):
    booking = get_booking_by_id(db, booking_id)
    booking = confirm_booking(db, booking)
    assignment = get_assignment_map_for_bookings(db, [booking_id]).get(booking_id)
    finding = get_findings_map_for_bookings(db, [booking_id]).get(booking_id)
    technician_name = None
    if assignment:
        technician = db.query(User).filter(User.id == assignment.technician_user_id).first()
        technician_name = technician.name if technician else None
    appointment_type = get_appointment_type_map_for_bookings(db, [booking_id]).get(booking_id, "inspection")
    return _to_booking_out(booking, assignment, finding, technician_name, appointment_type)


@router.post("/bookings/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking_for_management(
    booking_id: int,
    body: BookingCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.management")),
):
    booking = get_booking_by_id(db, booking_id)
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
    assignment = get_assignment_map_for_bookings(db, [booking_id]).get(booking_id)
    finding = get_findings_map_for_bookings(db, [booking_id]).get(booking_id)
    technician_name = None
    if assignment:
        technician = db.query(User).filter(User.id == assignment.technician_user_id).first()
        technician_name = technician.name if technician else None
    appointment_type = get_appointment_type_map_for_bookings(db, [booking_id]).get(booking_id, "inspection")
    return _to_booking_out(booking, assignment, finding, technician_name, appointment_type)


@router.post("/bookings/{booking_id}/reschedule", response_model=BookingOut)
def reschedule_booking_for_management(
    booking_id: int,
    body: BookingRescheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.schedule_appointments")),
):
    booking = get_booking_by_id(db, booking_id)

    if current_user.role == "csr":
        if body.appointment_type != "inspection":
            raise HTTPException(status_code=400, detail="CSR can only schedule inspection appointments")

    if current_user.role == "operations":
        if body.appointment_type != "treatment":
            raise HTTPException(status_code=400, detail="Operations can only schedule treatment appointments")

        assignment = get_assignment_map_for_bookings(db, [booking_id]).get(booking_id)
        if not assignment or not assignment.technician_user_id:
            raise HTTPException(status_code=400, detail="Assign a technician before scheduling treatment")

        finding = get_findings_map_for_bookings(db, [booking_id]).get(booking_id)
        if not finding or not (finding.findings or "").strip():
            raise HTTPException(status_code=400, detail="Technician findings are required before scheduling treatment")

    booking = reschedule_booking(db, booking, body.service_date, body.slot, body.appointment_type)

    client = db.query(User).filter(User.id == booking.user_id).first()
    if client:
        send_booking_schedule_update(
            to_email=client.email,
            to_name=client.name,
            service_date=str(booking.service_date),
            slot=booking.slot,
            appointment_type=body.appointment_type,
        )

    assignment = get_assignment_map_for_bookings(db, [booking_id]).get(booking_id)
    finding = get_findings_map_for_bookings(db, [booking_id]).get(booking_id)
    technician_name = None
    if assignment:
        technician = db.query(User).filter(User.id == assignment.technician_user_id).first()
        technician_name = technician.name if technician else None
    appointment_type = get_appointment_type_map_for_bookings(db, [booking_id]).get(booking_id, "inspection")
    return _to_booking_out(booking, assignment, finding, technician_name, appointment_type)
