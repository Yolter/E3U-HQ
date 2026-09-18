from fastapi import APIRouter, Depends, HTTPException

from lib.audit import log_action
from lib.auth import current_user, require
from lib.db import db
from models.schemas import AttendanceUpdate, Truck, TruckCreate, TruckStats

router = APIRouter(prefix="/trucks", tags=["trucks"])


@router.get("", response_model=list[Truck])
async def list_trucks():
    docs = await db.trucks.find({}, {"_id": 0}).sort("scheduled_for", 1).to_list(500)
    return [Truck(**d) for d in docs]


@router.get("/stats", response_model=TruckStats)
async def stats():
    docs = await db.trucks.find({}, {"_id": 0}).to_list(1000)
    completed = sum(1 for d in docs if d.get("completed"))
    seats = sum(len(d.get("participants", [])) for d in docs)
    attended = sum(len(d.get("attended", [])) for d in docs)
    counts: dict[str, int] = {}
    for d in docs:
        for name in d.get("participant_names", []):
            counts[name] = counts.get(name, 0) + 1
    top = sorted(counts.items(), key=lambda kv: -kv[1])[:5]
    return TruckStats(
        total=len(docs),
        completed=completed,
        upcoming=len(docs) - completed,
        attendance_rate=round(attended / seats * 100) if seats else 0,
        top_participants=[{"nickname": n, "runs": c} for n, c in top],
    )


@router.post("", response_model=Truck)
async def create_truck(payload: TruckCreate, user: dict = Depends(require("trucks.manage"))):
    truck = Truck(**payload.model_dump(), created_by=user["nickname"])
    await db.trucks.insert_one(truck.model_dump())
    await log_action(user, "truck.created", truck.title, truck.route, "trucks")
    return truck


@router.post("/{truck_id}/join", response_model=Truck)
async def join_truck(truck_id: str, user: dict = Depends(require("trucks.join"))):
    doc = await db.trucks.find_one({"id": truck_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.truck_not_found")
    if user["id"] in doc.get("participants", []):
        await db.trucks.update_one(
            {"id": truck_id},
            {"$pull": {"participants": user["id"], "participant_names": user["nickname"]}},
        )
        await db.users.update_one({"id": user["id"]}, {"$inc": {"truck_count": -1}})
        action = "truck.left"
    else:
        if len(doc.get("participants", [])) >= int(doc.get("capacity", 5)):
            raise HTTPException(status_code=400, detail="error.truck_full")
        await db.trucks.update_one(
            {"id": truck_id},
            {"$push": {"participants": user["id"], "participant_names": user["nickname"]}},
        )
        await db.users.update_one({"id": user["id"]}, {"$inc": {"truck_count": 1}})
        action = "truck.joined"
    await log_action(user, action, doc["title"], "", "trucks")
    updated = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    return Truck(**updated)


@router.patch("/{truck_id}/complete", response_model=Truck)
async def complete_truck(truck_id: str, user: dict = Depends(require("trucks.manage"))):
    doc = await db.trucks.find_one({"id": truck_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.truck_not_found")
    await db.trucks.update_one({"id": truck_id}, {"$set": {"completed": not doc.get("completed")}})
    await log_action(user, "truck.completion_toggled", doc["title"], "", "trucks")
    updated = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    return Truck(**updated)


@router.patch("/{truck_id}/attendance", response_model=Truck)
async def mark_attendance(
    truck_id: str, payload: AttendanceUpdate, user: dict = Depends(require("trucks.attendance"))
):
    doc = await db.trucks.find_one({"id": truck_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.truck_not_found")
    op = {"$addToSet" if payload.attended else "$pull": {"attended": payload.user_id}}
    await db.trucks.update_one({"id": truck_id}, op)
    if payload.attended:
        await db.users.update_one({"id": payload.user_id}, {"$inc": {"activity": 1}})
    await log_action(user, "truck.attendance_marked", doc["title"], payload.user_id, "trucks")
    updated = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    return Truck(**updated)


@router.delete("/{truck_id}")
async def delete_truck(truck_id: str, user: dict = Depends(require("trucks.manage"))):
    doc = await db.trucks.find_one({"id": truck_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.truck_not_found")
    await db.trucks.delete_one({"id": truck_id})
    await log_action(user, "truck.deleted", doc["title"], "", "trucks")
    return {"ok": True}
