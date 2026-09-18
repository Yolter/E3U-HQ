"""Recruitment centre + attestation: application → R4 review → R5 approval."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.audit import log_action
from lib.auth import can, current_user, hash_password, require
from lib.db import db
from models.schemas import Application, ApplicationCreate, ApplicationReview, UserPublic

router = APIRouter(prefix="/applications", tags=["recruitment"])


def _entry(actor: dict, status: str, notes: str) -> dict:
    return {
        "at": datetime.now(timezone.utc),
        "by": actor.get("nickname", "system"),
        "role": actor.get("role", "-"),
        "status": status,
        "notes": notes,
    }


@router.post("", response_model=Application)
async def submit(payload: ApplicationCreate):
    """Public: anyone can apply to join the clan."""
    app = Application(**payload.model_dump())
    app.history = [{"at": datetime.now(timezone.utc), "by": app.nickname, "role": "applicant", "status": "pending", "notes": ""}]
    await db.applications.insert_one(app.model_dump())
    await log_action(None, "application.submitted", app.nickname, app.game_id, "recruitment")
    return app


@router.get("", response_model=list[Application])
async def list_applications(status: str = "", _: dict = Depends(require("recruit.review"))):
    query = {"status": status} if status else {}
    docs = await db.applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Application(**d) for d in docs]


@router.get("/mine", response_model=list[Application])
async def my_applications(user: dict = Depends(current_user)):
    docs = await db.applications.find({"nickname": user["nickname"]}, {"_id": 0}).to_list(50)
    return [Application(**d) for d in docs]


@router.patch("/{app_id}", response_model=Application)
async def review(app_id: str, payload: ApplicationReview, user: dict = Depends(current_user)):
    doc = await db.applications.find_one({"id": app_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.application_not_found")
    # R4 recruit officers review/reject; only R5 grants final approval (attestation).
    if payload.status == "approved":
        if not can(user, "recruit.approve"):
            raise HTTPException(status_code=403, detail="error.forbidden:recruit.approve")
    elif not can(user, "recruit.review"):
        raise HTTPException(status_code=403, detail="error.forbidden:recruit.review")

    update: dict = {"status": payload.status, "interview_notes": payload.interview_notes}
    if payload.status == "approved":
        update["approved_by"] = user["nickname"]
    else:
        update["reviewed_by"] = user["nickname"]

    await db.applications.update_one(
        {"id": app_id},
        {"$set": update, "$push": {"history": _entry(user, payload.status, payload.interview_notes)}},
    )

    # Approval activates the matching member account if one exists.
    if payload.status == "approved":
        existing = await db.users.find_one({"nickname": doc["nickname"]})
        if existing:
            await db.users.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "status": "active",
                    "game_id": doc.get("game_id", ""),
                    "troop_type": doc.get("troop_type", ""),
                    "power": int(doc.get("power", 0)),
                }},
            )
    await log_action(user, f"application.{payload.status}", doc["nickname"], payload.interview_notes, "recruitment")
    updated = await db.applications.find_one({"id": app_id}, {"_id": 0})
    return Application(**updated)


@router.get("/queue/pending", response_model=list[UserPublic])
async def pending_members(_: dict = Depends(require("recruit.review"))):
    """Attestation queue: registered accounts awaiting activation."""
    docs = await db.users.find({"status": "pending"}, {"_id": 0, "password": 0}).to_list(200)
    return [UserPublic(**d) for d in docs]
