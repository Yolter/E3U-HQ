import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response

from lib.audit import log_action
from lib.auth import (
    create_session,
    current_user,
    destroy_session,
    hash_password,
    optional_user,
    permissions_for,
    verify_password,
)
from lib.db import db
from lib.emailer import send_password_reset
from models.schemas import (
    ChangePassword,
    ForgotPasswordRequest,
    LoginRequest,
    ProfileSettings,
    RegisterRequest,
    ResetPasswordRequest,
    UserPublic,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


def _public(doc: dict) -> UserPublic:
    return UserPublic(**{k: v for k, v in doc.items() if k not in ("_id", "password")})


@router.post("/register", response_model=UserPublic)
async def register(payload: RegisterRequest, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="error.email_taken")
    if await db.users.find_one({"nickname": payload.nickname}):
        raise HTTPException(status_code=409, detail="error.nickname_taken")
    # Attestation: new accounts start pending until an officer reviews them.
    user = UserPublic(
        nickname=payload.nickname,
        email=email,
        city=payload.city,
        language=payload.language,
        avatar_seed=payload.nickname,
        status="pending",
        online=True,
    )
    doc = user.model_dump()
    doc["password"] = hash_password(payload.password)
    await db.users.insert_one(doc)
    await create_session(response, user.id)
    await log_action(doc, "member.registered", user.nickname, "pending attestation", "members")
    return user


@router.post("/login", response_model=UserPublic)
async def login(payload: LoginRequest, response: Response):
    doc = await db.users.find_one({"email": payload.email.lower()})
    if not doc or not verify_password(payload.password, doc.get("password", "")):
        raise HTTPException(status_code=401, detail="error.bad_credentials")
    await db.users.update_one(
        {"id": doc["id"]}, {"$set": {"last_active": datetime.now(timezone.utc), "online": True}}
    )
    await create_session(response, doc["id"], remember=payload.remember)
    return _public(doc)


@router.post("/logout")
async def logout(response: Response, e3u_session: str | None = Cookie(default=None)):
    await destroy_session(response, e3u_session)
    return {"ok": True}


@router.get("/me", response_model=UserPublic | None)
async def me(user: dict | None = Depends(optional_user)):
    return _public(user) if user else None


@router.get("/permissions")
async def my_permissions(user: dict = Depends(current_user)):
    return {
        "role": user.get("role", "R1"),
        "officer_roles": user.get("officer_roles", []),
        "permissions": permissions_for(user),
    }


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    doc = await db.users.find_one({"email": payload.email.lower()})
    # Always answer 200: never reveal whether an address is registered.
    if doc:
        token = secrets.token_urlsafe(32)
        await db.password_resets.insert_one(
            {
                "token": token,
                "user_id": doc["id"],
                "created_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(minutes=60),
            }
        )
        try:
            await send_password_reset(to=doc["email"], nickname=doc["nickname"], token=token)
            delivery = "email sent"
        except Exception as exc:  # noqa: BLE001
            # Never surface delivery problems to the caller: that would both leak
            # account existence and break the flow for an undeliverable address.
            logger.error("password reset email failed for %s: %s", doc["id"], exc)
            delivery = "email failed"
        await log_action(doc, "auth.password_reset_requested", doc["nickname"], delivery, "auth")
    return {"ok": True}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    entry = await db.password_resets.find_one({"token": payload.token})
    if not entry:
        raise HTTPException(status_code=400, detail="error.reset_invalid")
    expires = entry["expires_at"]
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="error.reset_expired")
    await db.users.update_one(
        {"id": entry["user_id"]}, {"$set": {"password": hash_password(payload.password)}}
    )
    await db.password_resets.delete_many({"user_id": entry["user_id"]})
    await db.sessions.delete_many({"user_id": entry["user_id"]})  # force re-login everywhere
    doc = await db.users.find_one({"id": entry["user_id"]}, {"_id": 0, "password": 0})
    await log_action(doc, "auth.password_reset", (doc or {}).get("nickname", ""), "", "auth")
    return {"ok": True}


@router.put("/settings", response_model=UserPublic)
async def update_settings(payload: ProfileSettings, user: dict = Depends(current_user)):
    clash = await db.users.find_one({"nickname": payload.nickname, "id": {"$ne": user["id"]}})
    if clash:
        raise HTTPException(status_code=409, detail="error.nickname_taken")
    await db.users.update_one({"id": user["id"]}, {"$set": payload.model_dump()})
    doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    await log_action(user, "profile.updated", user["nickname"], "", "profile")
    return UserPublic(**doc)


@router.put("/password")
async def change_password(payload: ChangePassword, user: dict = Depends(current_user)):
    doc = await db.users.find_one({"id": user["id"]})
    if not doc or not verify_password(payload.current_password, doc.get("password", "")):
        raise HTTPException(status_code=400, detail="error.bad_current_password")
    await db.users.update_one(
        {"id": user["id"]}, {"$set": {"password": hash_password(payload.new_password)}}
    )
    await log_action(user, "auth.password_changed", user["nickname"], "", "auth")
    return {"ok": True}
