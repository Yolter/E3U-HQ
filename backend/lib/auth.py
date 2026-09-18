"""RBAC core: ranks, officer specializations, session cookies, password hashing.

Permission model
---------------
Every permission has a minimum rank (R1=1 … R5=5). Management permissions are
additionally gated behind an **officer specialization**: an R4 only receives the
tools of the specializations R5 assigned to them, so a Bank Manager cannot touch
trucks. R5 implicitly holds every permission.
"""

import hashlib
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Cookie, Depends, HTTPException, Response

from lib.db import db

COOKIE_NAME = "e3u_session"
SESSION_DAYS_DEFAULT = 1
SESSION_DAYS_REMEMBER = 30

ROLE_RANK = {"R1": 1, "R2": 2, "R3": 3, "R4": 4, "R5": 5}

# Officer specializations (R4 only; R5 holds all of them implicitly).
SPECIALIZATIONS: dict[str, list[str]] = {
    "bank_manager": ["bank.approve", "bank.report", "bank.export"],
    "truck_manager": ["trucks.manage", "trucks.attendance", "trucks.report"],
    "recruit_officer": ["recruit.review", "recruit.interview"],
    "diplomat": ["diplomacy.view", "diplomacy.manage"],
    "forum_moderator": ["forum.moderate", "forum.pin"],
    "event_officer": ["events.manage", "events.remind"],
}
SPECIALIZATION_KEYS = list(SPECIALIZATIONS)

# Minimum rank for each permission. Permissions that also appear in a
# specialization require BOTH the rank and (below R5) the specialization.
PERMISSIONS: dict[str, int] = {
    # read — everyone in the clan
    "bank.view": 1,
    "bank.donate": 1,
    "trucks.view": 1,
    "trucks.join": 1,
    "forum.view": 1,
    "forum.post": 1,
    "events.view": 1,
    "events.join": 1,
    "members.view": 1,
    "reports.create": 1,
    "encyclopedia.view": 1,
    "ai.use": 1,
    "penalties.view_own": 1,
    # officer tools — rank 4 + specialization
    "bank.approve": 4,
    "bank.report": 4,
    "bank.export": 4,
    "trucks.manage": 4,
    "trucks.attendance": 4,
    "trucks.report": 4,
    "recruit.review": 4,
    "recruit.interview": 4,
    "diplomacy.view": 4,
    "diplomacy.manage": 4,
    "forum.moderate": 4,
    "forum.pin": 4,
    "events.manage": 4,
    "events.remind": 4,
    "reports.read": 4,
    "penalties.manage": 4,
    # leader only
    "recruit.approve": 5,
    "members.manage": 5,
    "roles.manage": 5,
    "audit.view": 5,
    "admin.access": 5,
    "settings.manage": 5,
}

# Which permissions are specialization-gated at R4.
_SPEC_GATED = {p for perms in SPECIALIZATIONS.values() for p in perms}


def rank(role: str) -> int:
    return ROLE_RANK.get(role, 0)


def can(user: dict | None, permission: str) -> bool:
    """Single source of truth. `user` is the stored user document."""
    if not user:
        return False
    role = user.get("role", "R1")
    required = PERMISSIONS.get(permission)
    if required is None:
        return False
    user_rank = rank(role)
    if user_rank < required:
        return False
    if user_rank >= 5:  # leader holds everything
        return True
    if permission in _SPEC_GATED:
        granted: set[str] = set()
        for spec in user.get("officer_roles", []) or []:
            granted.update(SPECIALIZATIONS.get(spec, []))
        return permission in granted
    return True


def permissions_for(user: dict | None) -> list[str]:
    return [p for p in PERMISSIONS if can(user, p)]


# ---------- passwords ----------
def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, _ = stored.split("$", 1)
    except ValueError:
        return False
    return secrets.compare_digest(hash_password(password, salt), stored)


# ---------- sessions ----------
def _cookie_samesite() -> str:
    """"none" is required when the API and the frontend are on different domains
    (Cloudflare Pages + Render); it implies Secure, so HTTPS is mandatory there."""
    value = os.environ.get("COOKIE_SAMESITE", "lax").lower()
    return value if value in {"lax", "strict", "none"} else "lax"


def _secure_cookie() -> bool:
    return os.environ.get("APP_URL", "").startswith("https") or _cookie_samesite() == "none"


async def create_session(response: Response, user_id: str, remember: bool = False) -> None:
    days = SESSION_DAYS_REMEMBER if remember else SESSION_DAYS_DEFAULT
    token = str(uuid.uuid4())
    await db.sessions.insert_one(
        {
            "token": token,
            "user_id": user_id,
            "remember": remember,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=days),
        }
    )
    response.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        max_age=days * 86400,
        samesite=_cookie_samesite(),  # type: ignore[arg-type]
        secure=_secure_cookie(),
        path="/",
    )


async def destroy_session(response: Response, token: str | None) -> None:
    if token:
        await db.sessions.delete_one({"token": token})
    response.delete_cookie(COOKIE_NAME, path="/")


async def optional_user(e3u_session: str | None = Cookie(default=None)) -> dict | None:
    if not e3u_session:
        return None
    sess = await db.sessions.find_one({"token": e3u_session})
    if not sess:
        return None
    return await db.users.find_one({"id": sess["user_id"]}, {"_id": 0, "password": 0})


async def current_user(user: dict | None = Depends(optional_user)) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="error.unauthenticated")
    return user


def require(permission: str):
    """Route dependency — returns the user or raises 403 with a translatable key."""

    async def _dep(user: dict = Depends(current_user)) -> dict:
        if not can(user, permission):
            raise HTTPException(status_code=403, detail=f"error.forbidden:{permission}")
        return user

    return _dep
