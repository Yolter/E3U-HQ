from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.audit import log_action
from lib.auth import require
from lib.db import db
from models.schemas import DiplomacyCreate, DiplomacyEntry

router = APIRouter(prefix="/diplomacy", tags=["diplomacy"])


@router.get("", response_model=list[DiplomacyEntry])
async def list_entries(relation: str = "", _: dict = Depends(require("diplomacy.view"))):
    query = {"relation": relation} if relation else {}
    docs = await db.diplomacy.find(query, {"_id": 0}).sort("clan_name", 1).to_list(500)
    return [DiplomacyEntry(**d) for d in docs]


@router.post("", response_model=DiplomacyEntry)
async def create_entry(payload: DiplomacyCreate, user: dict = Depends(require("diplomacy.manage"))):
    entry = DiplomacyEntry(**payload.model_dump(), updated_by=user["nickname"])
    await db.diplomacy.insert_one(entry.model_dump())
    await log_action(user, "diplomacy.entry_created", entry.clan_name, entry.relation, "diplomacy")
    return entry


@router.put("/{entry_id}", response_model=DiplomacyEntry)
async def update_entry(entry_id: str, payload: DiplomacyCreate, user: dict = Depends(require("diplomacy.manage"))):
    doc = await db.diplomacy.find_one({"id": entry_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.diplomacy_not_found")
    await db.diplomacy.update_one(
        {"id": entry_id},
        {"$set": {**payload.model_dump(), "updated_by": user["nickname"], "updated_at": datetime.now(timezone.utc)}},
    )
    await log_action(user, "diplomacy.entry_updated", payload.clan_name, payload.relation, "diplomacy")
    updated = await db.diplomacy.find_one({"id": entry_id}, {"_id": 0})
    return DiplomacyEntry(**updated)


@router.delete("/{entry_id}")
async def delete_entry(entry_id: str, user: dict = Depends(require("diplomacy.manage"))):
    doc = await db.diplomacy.find_one({"id": entry_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.diplomacy_not_found")
    await db.diplomacy.delete_one({"id": entry_id})
    await log_action(user, "diplomacy.entry_deleted", doc["clan_name"], "", "diplomacy")
    return {"ok": True}
