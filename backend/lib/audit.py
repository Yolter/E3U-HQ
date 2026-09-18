"""Append-only audit trail. Entries are never updated or deleted."""

import uuid
from datetime import datetime, timezone

from lib.db import db


async def log_action(
    actor: dict | None,
    action: str,
    target: str = "",
    details: str = "",
    module: str = "general",
) -> None:
    await db.audit_log.insert_one(
        {
            "id": str(uuid.uuid4()),
            "actor_id": (actor or {}).get("id", "system"),
            "actor_nickname": (actor or {}).get("nickname", "system"),
            "actor_role": (actor or {}).get("role", "-"),
            "action": action,
            "module": module,
            "target": target,
            "details": details,
            "created_at": datetime.now(timezone.utc),
        }
    )
