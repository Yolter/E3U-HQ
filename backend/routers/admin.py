from fastapi import APIRouter, Depends

from lib.auth import require
from lib.db import db

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview")
async def overview(_=Depends(require("admin.access"))):
    role_counts = {r: await db.users.count_documents({"role": r}) for r in ("R1", "R2", "R3", "R4", "R5")}
    return {
        "members": await db.users.count_documents({}),
        "pending_members": await db.users.count_documents({"status": "pending"}),
        "role_counts": role_counts,
        "pending_donations": await db.donations.count_documents({"status": "pending"}),
        "trucks": await db.trucks.count_documents({}),
        "open_trucks": await db.trucks.count_documents({"completed": False}),
        "threads": await db.forum_threads.count_documents({}),
        "events": await db.events.count_documents({}),
        "pending_applications": await db.applications.count_documents({"status": "pending"}),
        "open_reports": await db.reports.count_documents({"status": "open"}),
        "penalties": await db.penalties.count_documents({}),
        "audit_entries": await db.audit_log.count_documents({}),
        "diplomacy_entries": await db.diplomacy.count_documents({}),
    }
