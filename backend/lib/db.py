"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "users": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("email", ASCENDING)], name="email", unique=True),
        IndexModel([("nickname", ASCENDING)], name="nickname", unique=True),
        IndexModel([("role", ASCENDING), ("contribution", DESCENDING)], name="role_contribution"),
    ],
    "sessions": [
        IndexModel([("token", ASCENDING)], name="token", unique=True),
        IndexModel([("expires_at", ASCENDING)], name="ttl", expireAfterSeconds=0),
    ],
    "donations": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created"),
        IndexModel([("resource", ASCENDING), ("created_at", DESCENDING)], name="resource_created"),
    ],
    "trucks": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("scheduled_for", ASCENDING)], name="scheduled"),
    ],
    "forum_threads": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("category", ASCENDING), ("created_at", DESCENDING)], name="cat_created"),
    ],
    "forum_posts": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("thread_id", ASCENDING), ("created_at", ASCENDING)], name="thread_created"),
    ],
    "events": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("starts_at", ASCENDING)], name="starts"),
    ],
    "password_resets": [
        IndexModel([("token", ASCENDING)], name="token", unique=True),
        IndexModel([("expires_at", ASCENDING)], name="ttl", expireAfterSeconds=0),
    ],
    "applications": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created"),
    ],
    "penalties": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("member_id", ASCENDING), ("created_at", DESCENDING)], name="member_created"),
    ],
    "reports": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("status", ASCENDING), ("created_at", DESCENDING)], name="status_created"),
    ],
    "diplomacy": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("relation", ASCENDING), ("clan_name", ASCENDING)], name="relation_name"),
    ],
    "audit_log": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("created_at", DESCENDING)], name="created_desc"),
        IndexModel([("module", ASCENDING), ("created_at", DESCENDING)], name="module_created"),
    ],
    "ai_messages": [
        IndexModel([("id", ASCENDING)], name="id", unique=True),
        IndexModel([("user_id", ASCENDING), ("created_at", ASCENDING)], name="user_created"),
    ],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)
