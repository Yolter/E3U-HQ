from fastapi import APIRouter, Depends

from lib.auth import require
from lib.db import db
from models.schemas import AuditEntry

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditEntry])
async def list_audit(module: str = "", q: str = "", _: dict = Depends(require("audit.view"))):
    query: dict = {}
    if module:
        query["module"] = module
    if q:
        query["$or"] = [
            {"actor_nickname": {"$regex": q, "$options": "i"}},
            {"action": {"$regex": q, "$options": "i"}},
            {"target": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.audit_log.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [AuditEntry(**d) for d in docs]
