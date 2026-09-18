from fastapi import APIRouter, Depends, HTTPException

from lib.audit import log_action
from lib.auth import SPECIALIZATION_KEYS, current_user, require
from lib.db import db
from models.schemas import Penalty, PenaltyCreate, RoleUpdate, StatusUpdate, UserPublic

router = APIRouter(prefix="/members", tags=["members"])


@router.get("", response_model=list[UserPublic])
async def list_members(q: str = "", role: str = "", city: str = "", status: str = ""):
    query: dict = {}
    if q:
        query["nickname"] = {"$regex": q, "$options": "i"}
    if role:
        query["role"] = role
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if status:
        query["status"] = status
    docs = await db.users.find(query, {"_id": 0, "password": 0}).to_list(500)
    docs.sort(key=lambda d: (-int(d.get("contribution", 0)), d.get("nickname", "")))
    return [UserPublic(**d) for d in docs]


@router.get("/specializations")
async def specializations():
    return {"specializations": SPECIALIZATION_KEYS}


@router.get("/{member_id}", response_model=UserPublic)
async def get_member(member_id: str):
    doc = await db.users.find_one({"id": member_id}, {"_id": 0, "password": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="error.member_not_found")
    return UserPublic(**doc)


@router.patch("/{member_id}/role", response_model=UserPublic)
async def set_role(member_id: str, payload: RoleUpdate, actor=Depends(require("roles.manage"))):
    doc = await db.users.find_one({"id": member_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.member_not_found")
    bad = [s for s in payload.officer_roles if s not in SPECIALIZATION_KEYS]
    if bad:
        raise HTTPException(status_code=400, detail="error.unknown_specialization")
    officer_roles = payload.officer_roles if payload.role in ("R4", "R5") else []
    await db.users.update_one(
        {"id": member_id},
        {"$set": {"role": payload.role, "title": payload.title, "officer_roles": officer_roles}},
    )
    await log_action(
        actor,
        "role.changed",
        doc["nickname"],
        f"{doc.get('role')} → {payload.role}; officer_roles={officer_roles}",
        "members",
    )
    updated = await db.users.find_one({"id": member_id}, {"_id": 0, "password": 0})
    return UserPublic(**updated)


@router.patch("/{member_id}/status", response_model=UserPublic)
async def set_status(member_id: str, payload: StatusUpdate, actor=Depends(require("members.manage"))):
    doc = await db.users.find_one({"id": member_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.member_not_found")
    await db.users.update_one({"id": member_id}, {"$set": {"status": payload.status}})
    await log_action(actor, "member.status_changed", doc["nickname"], payload.status, "members")
    updated = await db.users.find_one({"id": member_id}, {"_id": 0, "password": 0})
    return UserPublic(**updated)


# ---------- penalties (append-only history) ----------
@router.get("/{member_id}/penalties", response_model=list[Penalty])
async def member_penalties(member_id: str, user: dict = Depends(current_user)):
    from lib.auth import can

    if member_id != user["id"] and not can(user, "penalties.manage"):
        raise HTTPException(status_code=403, detail="error.forbidden:penalties.manage")
    docs = await db.penalties.find({"member_id": member_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Penalty(**d) for d in docs]


@router.get("/penalties/all", response_model=list[Penalty])
async def all_penalties(_=Depends(require("penalties.manage"))):
    docs = await db.penalties.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Penalty(**d) for d in docs]


@router.post("/penalties", response_model=Penalty)
async def create_penalty(payload: PenaltyCreate, actor=Depends(require("penalties.manage"))):
    member = await db.users.find_one({"id": payload.member_id})
    if not member:
        raise HTTPException(status_code=404, detail="error.member_not_found")
    penalty = Penalty(
        member_id=payload.member_id,
        member_nickname=member["nickname"],
        kind=payload.kind,
        reason=payload.reason,
        amount=payload.amount,
        issued_by=actor["nickname"],
    )
    await db.penalties.insert_one(penalty.model_dump())
    if payload.kind in ("warning", "violation"):
        await db.users.update_one({"id": payload.member_id}, {"$inc": {"warning_count": 1}})
    await log_action(actor, "penalty.issued", member["nickname"], f"{payload.kind}: {payload.reason}", "members")
    return penalty
