from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import require_feature
from controller_booking import (
    list_all_bookings,
    list_technicians,
    get_assignment_map_for_bookings,
    get_booking_by_id,
    assign_technician,
    confirm_booking,
    cancel_booking,
)
from database import get_db
from models import User
from schemas import (
    BookingListResponse,
    BookingOut,
    AssignTechnicianRequest,
    TechnicianListResponse,
)

router = APIRouter(prefix="/booking-management", tags=["booking-management"])


@router.get("/bookings", response_model=BookingListResponse)
def list_bookings_for_management(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.management")),
):
    bookings = list_all_bookings(db)
    assignment_map = get_assignment_map_for_bookings(db, [b.id for b in bookings])
    technicians = {u.id: u for u in list_technicians(db)}

    payload = []
    for booking in bookings:
        assignment = assignment_map.get(booking.id)
        tech = technicians.get(assignment.technician_user_id) if assignment else None
        payload.append(
            BookingOut(
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
                assigned_technician_name=tech.name if tech else None,
                assigned_at=assignment.assigned_at if assignment else None,
                created_at=booking.created_at,
            )
        )

    return {"bookings": payload, "total": len(payload)}


@router.get("/technicians", response_model=TechnicianListResponse)
def technicians_for_assignment(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.management")),
):
    technicians = list_technicians(db)
    payload = [{"id": t.id, "name": t.name, "email": t.email} for t in technicians]
    return {"technicians": payload, "total": len(payload)}


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
        assigned_technician_user_id=assignment.technician_user_id,
        assigned_technician_name=technician.name if technician else None,
        assigned_at=assignment.assigned_at,
        created_at=booking.created_at,
    )


@router.post("/bookings/{booking_id}/confirm", response_model=BookingOut)
def confirm_booking_for_management(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.management")),
):
    booking = get_booking_by_id(db, booking_id)
    return confirm_booking(db, booking)


@router.post("/bookings/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking_for_management(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_feature("booking.management")),
):
    booking = get_booking_by_id(db, booking_id)
    return cancel_booking(db, booking)
