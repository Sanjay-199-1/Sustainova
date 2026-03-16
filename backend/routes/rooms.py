from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import logging

from database import get_db
from dependencies.auth import get_current_user, require_role
from models.models import Event, Guest, RoomAllocation
from schemas.schemas import RoomAllocationCreate, RoomAllocationOut

router = APIRouter(tags=["rooms"])
logger = logging.getLogger(__name__)


@router.post("/organizer/allocate-room", response_model=RoomAllocationOut)
def allocate_room(
    payload: RoomAllocationCreate,
    user: dict = Depends(require_role("organizer")),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(
        Event.id == payload.event_id,
        Event.user_id == int(user.get("sub")),
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    guest = db.query(Guest).filter(
        Guest.id == payload.guest_id,
        Guest.event_id == event.id,
    ).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found for this event")

    allocation = db.query(RoomAllocation).filter(RoomAllocation.guest_id == guest.id).first()
    if allocation:
        allocation.hotel_name = payload.hotel_name.strip()
        allocation.room_number = payload.room_number.strip()
    else:
        allocation = RoomAllocation(
            guest_id=guest.id,
            event_id=event.id,
            hotel_name=payload.hotel_name.strip(),
            room_number=payload.room_number.strip(),
        )
        db.add(allocation)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        logger.exception("Room allocation failed")
        raise HTTPException(status_code=400, detail="Room allocation failed")

    db.refresh(allocation)
    return allocation


@router.get("/guest/room-details/{guest_id}", response_model=RoomAllocationOut | dict)
def guest_room_details(
    guest_id: int,
    user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.get("role") != "guest":
        raise HTTPException(status_code=403, detail="Access forbidden")

    sub = str(user.get("sub") or "")
    if not sub.isdigit() or int(sub) != guest_id:
        raise HTTPException(status_code=403, detail="Access forbidden")

    allocation = db.query(RoomAllocation).filter(RoomAllocation.guest_id == guest_id).first()
    if not allocation:
        return {}
    return allocation


@router.get("/organizer/room-allocations/{event_id}")
def list_room_allocations(
    event_id: int,
    user: dict = Depends(require_role("organizer")),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(
        Event.id == event_id,
        Event.user_id == int(user.get("sub")),
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    rows = (
        db.query(RoomAllocation, Guest)
        .join(Guest, Guest.id == RoomAllocation.guest_id)
        .filter(RoomAllocation.event_id == event_id)
        .order_by(RoomAllocation.allocated_at.desc())
        .all()
    )
    return [
        {
            "id": allocation.id,
            "guest_id": allocation.guest_id,
            "event_id": allocation.event_id,
            "hotel_name": allocation.hotel_name,
            "room_number": allocation.room_number,
            "allocated_at": allocation.allocated_at,
            "guest_name": guest.name,
            "guest_status": guest.status,
        }
        for allocation, guest in rows
    ]
