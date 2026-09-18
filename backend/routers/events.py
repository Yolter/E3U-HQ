from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.audit import log_action
from lib.auth import current_user, require
from lib.db import db
from lib.emailer import send_event_reminder
from models.schemas import Event, EventCreate

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[Event])
async def list_events():
    docs = await db.events.find({}, {"_id": 0}).sort("starts_at", 1).to_list(500)
    return [Event(**d) for d in docs]


@router.post("", response_model=Event)
async def create_event(payload: EventCreate, user: dict = Depends(require("events.manage"))):
    event = Event(**payload.model_dump())
    await db.events.insert_one(event.model_dump())
    await log_action(user, "event.created", event.title, event.kind, "events")
    return event


@router.post("/{event_id}/join", response_model=Event)
async def join_event(event_id: str, user: dict = Depends(require("events.join"))):
    doc = await db.events.find_one({"id": event_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.event_not_found")
    if user["id"] in doc.get("participants", []):
        op = {"$pull": {"participants": user["id"], "participant_names": user["nickname"]}}
    else:
        op = {"$push": {"participants": user["id"], "participant_names": user["nickname"]}}
    await db.events.update_one({"id": event_id}, op)
    updated = await db.events.find_one({"id": event_id}, {"_id": 0})
    return Event(**updated)


@router.delete("/{event_id}")
async def delete_event(event_id: str, user: dict = Depends(require("events.manage"))):
    doc = await db.events.find_one({"id": event_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.event_not_found")
    await db.events.delete_one({"id": event_id})
    await log_action(user, "event.deleted", doc["title"], "", "events")
    return {"ok": True}


@router.post("/{event_id}/remind")
async def send_reminders(event_id: str, user: dict = Depends(require("events.remind"))):
    """Emails every participant a reminder. Recipients come from the event record."""
    doc = await db.events.find_one({"id": event_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.event_not_found")
    starts = doc["starts_at"]
    if isinstance(starts, datetime) and starts.tzinfo is None:
        starts = starts.replace(tzinfo=timezone.utc)
    when = starts.strftime("%Y-%m-%d %H:%M") if isinstance(starts, datetime) else ""
    sent = 0
    for member_id in doc.get("participants", []):
        member = await db.users.find_one({"id": member_id}, {"_id": 0, "password": 0})
        if not member or not member.get("email"):
            continue
        await send_event_reminder(
            to=member["email"], nickname=member["nickname"], title=doc["title"], when=when
        )
        sent += 1
    await db.events.update_one({"id": event_id}, {"$set": {"reminder_sent": True}})
    await log_action(user, "event.reminders_sent", doc["title"], f"{sent} recipients", "events")
    return {"sent": sent}
