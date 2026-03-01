from datetime import date
from typing import List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import Booking, BookingAssignment, TechnicianFinding, User


DEFAULT_SLOTS = [
    "09:00-10:00",
    "10:00-11:00",
    "11:00-12:00",
    "13:00-14:00",
    "14:00-15:00",
    "15:00-16:00",
]


ALLOWED_BOOKING_STATUSES = {"pending", "confirmed", "cancelled"}


def get_slot_availability(db: Session, service_date: date) -> list[dict]:
    active_bookings = (
        db.query(Booking)
        .filter(
            Booking.service_date == service_date,
            Booking.status.in_(["pending", "confirmed"]),
        )
        .all()
    )

    used_slots = {booking.slot for booking in active_bookings}
    return [{"slot": slot, "available": slot not in used_slots} for slot in DEFAULT_SLOTS]


def create_booking(
    db: Session,
    user_id: int,
    service_date: date,
    slot: str,
    pest_type: str,
    property_type: str,
    address: str,
    notes: str | None,
) -> Booking:
    slots = get_slot_availability(db, service_date)
    target = next((slot_item for slot_item in slots if slot_item["slot"] == slot), None)

    if not target:
        raise HTTPException(status_code=400, detail="Invalid slot selected")

    if not target["available"]:
        raise HTTPException(status_code=409, detail="Slot is no longer available")

    booking = Booking(
        user_id=user_id,
        service_date=service_date,
        slot=slot,
        pest_type=pest_type,
        property_type=property_type,
        address=address,
        notes=notes,
        status="pending",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def list_user_bookings(db: Session, user_id: int) -> List[Booking]:
    return (
        db.query(Booking)
        .filter(Booking.user_id == user_id)
        .order_by(Booking.service_date.desc(), Booking.created_at.desc())
        .all()
    )


def list_all_bookings(db: Session) -> List[Booking]:
    return (
        db.query(Booking)
        .order_by(Booking.service_date.desc(), Booking.created_at.desc())
        .all()
    )


def list_technicians(db: Session) -> List[User]:
    return (
        db.query(User)
        .filter(User.role == "technician", User.is_active == True)
        .order_by(User.name.asc())
        .all()
    )


def get_assignment_map_for_bookings(db: Session, booking_ids: List[int]) -> dict[int, BookingAssignment]:
    if not booking_ids:
        return {}

    assignments = (
        db.query(BookingAssignment)
        .filter(BookingAssignment.booking_id.in_(booking_ids))
        .all()
    )
    return {a.booking_id: a for a in assignments}


def get_findings_map_for_bookings(db: Session, booking_ids: List[int]) -> dict[int, TechnicianFinding]:
    if not booking_ids:
        return {}

    findings = (
        db.query(TechnicianFinding)
        .filter(TechnicianFinding.booking_id.in_(booking_ids))
        .all()
    )
    return {f.booking_id: f for f in findings}


def get_booking_by_id(db: Session, booking_id: int) -> Booking:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


def get_booking_for_user(db: Session, booking_id: int, user_id: int) -> Booking:
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == user_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


def assign_technician(
    db: Session,
    booking: Booking,
    technician_user_id: int,
    assigned_by_user_id: int,
) -> BookingAssignment:
    technician = (
        db.query(User)
        .filter(User.id == technician_user_id, User.role == "technician", User.is_active == True)
        .first()
    )
    if not technician:
        raise HTTPException(status_code=404, detail="Technician not found or inactive")

    assignment = db.query(BookingAssignment).filter(BookingAssignment.booking_id == booking.id).first()
    if assignment:
        assignment.technician_user_id = technician_user_id
        assignment.assigned_by_user_id = assigned_by_user_id
        assignment.status = "assigned"
    else:
        assignment = BookingAssignment(
            booking_id=booking.id,
            technician_user_id=technician_user_id,
            assigned_by_user_id=assigned_by_user_id,
            status="assigned",
        )
        db.add(assignment)

    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot assign technician to cancelled booking")

    db.commit()
    db.refresh(assignment)
    return assignment


def list_assigned_bookings_for_technician(db: Session, technician_user_id: int) -> List[Booking]:
    booking_ids = (
        db.query(BookingAssignment.booking_id)
        .filter(BookingAssignment.technician_user_id == technician_user_id)
        .all()
    )
    flat_ids = [b[0] for b in booking_ids]
    if not flat_ids:
        return []

    return (
        db.query(Booking)
        .filter(Booking.id.in_(flat_ids))
        .order_by(Booking.service_date.asc(), Booking.slot.asc())
        .all()
    )


def get_assignment_for_technician(db: Session, booking_id: int, technician_user_id: int) -> BookingAssignment:
    assignment = (
        db.query(BookingAssignment)
        .filter(
            BookingAssignment.booking_id == booking_id,
            BookingAssignment.technician_user_id == technician_user_id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found for this technician")
    return assignment


def upsert_technician_findings(
    db: Session,
    booking_id: int,
    technician_user_id: int,
    findings_text: str,
) -> TechnicianFinding:
    finding = (
        db.query(TechnicianFinding)
        .filter(TechnicianFinding.booking_id == booking_id)
        .first()
    )

    if finding:
        finding.findings = findings_text
        finding.technician_user_id = technician_user_id
    else:
        finding = TechnicianFinding(
            booking_id=booking_id,
            technician_user_id=technician_user_id,
            findings=findings_text,
        )
        db.add(finding)

    db.commit()
    db.refresh(finding)
    return finding


def update_assignment_status(db: Session, assignment: BookingAssignment, status: str) -> BookingAssignment:
    assignment.status = status
    db.commit()
    db.refresh(assignment)
    return assignment


def confirm_booking(db: Session, booking: Booking) -> Booking:
    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cancelled bookings cannot be confirmed")
    booking.status = "confirmed"
    db.commit()
    db.refresh(booking)
    return booking


def cancel_booking(db: Session, booking: Booking) -> Booking:
    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    return booking
