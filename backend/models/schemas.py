"""Pydantic v2 models. Each has a hand-written TS mirror in frontend/src/lib/types.ts."""

import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

Role = Literal["R1", "R2", "R3", "R4", "R5"]
Resource = Literal["cash", "arms", "cargo", "diamonds"]
Lang = Literal["ru", "en", "es", "tr"]
MemberStatus = Literal["pending", "active", "rejected"]


def _id() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------- users ----------
class UserPublic(BaseModel):
    id: str = Field(default_factory=_id)
    nickname: str
    email: str
    city: str
    language: Lang = "ru"
    role: Role = "R1"
    officer_roles: list[str] = []
    title: str = ""
    status: MemberStatus = "active"
    game_id: str = ""
    troop_type: str = ""
    power: int = 0
    telegram: str = ""
    whatsapp: str = ""
    joined_at: datetime = Field(default_factory=_now)
    last_active: datetime = Field(default_factory=_now)
    contribution: int = 0
    activity: int = 0
    truck_count: int = 0
    warning_count: int = 0
    online: bool = False
    avatar_seed: str = "e3u"


class RegisterRequest(BaseModel):
    nickname: str = Field(min_length=2, max_length=24)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    city: str = Field(min_length=1, max_length=60)
    language: Lang = "ru"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember: bool = False


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=6, max_length=128)


class ProfileSettings(BaseModel):
    nickname: str = Field(min_length=2, max_length=24)
    city: str = Field(min_length=1, max_length=60)
    language: Lang
    game_id: str = ""
    troop_type: str = ""
    power: int = 0
    telegram: str = ""
    whatsapp: str = ""


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=128)


class RoleUpdate(BaseModel):
    role: Role
    title: str = ""
    officer_roles: list[str] = []


class StatusUpdate(BaseModel):
    status: MemberStatus


# ---------- bank ----------
class Donation(BaseModel):
    id: str = Field(default_factory=_id)
    player_id: str
    player_nickname: str
    resource: Resource
    amount: int = Field(ge=1)
    notes: str = ""
    # Two-officer rule: pending → awaiting_second (one signature) → approved (two).
    status: Literal["pending", "awaiting_second", "approved", "rejected"] = "pending"
    approved_by: str | None = None
    first_approved_by: str | None = None
    second_approved_by: str | None = None
    created_at: datetime = Field(default_factory=_now)


class DonationCreate(BaseModel):
    resource: Resource
    amount: int = Field(ge=1)
    notes: str = ""


class DonationReview(BaseModel):
    status: Literal["approved", "rejected"]


class BankSummary(BaseModel):
    totals: dict[str, int]
    pending_count: int
    approved_count: int
    top_contributors: list[dict]
    timeline: list[dict]


# ---------- trucks ----------
class Truck(BaseModel):
    id: str = Field(default_factory=_id)
    title: str
    scheduled_for: datetime
    route: str = ""
    capacity: int = 5
    participants: list[str] = []
    participant_names: list[str] = []
    attended: list[str] = []
    completed: bool = False
    created_by: str = ""


class TruckCreate(BaseModel):
    title: str = Field(min_length=2)
    scheduled_for: datetime
    route: str = ""
    capacity: int = Field(default=5, ge=1, le=50)


class AttendanceUpdate(BaseModel):
    user_id: str
    attended: bool


class TruckStats(BaseModel):
    total: int
    completed: int
    upcoming: int
    attendance_rate: int
    top_participants: list[dict]


# ---------- forum ----------
class ForumThread(BaseModel):
    id: str = Field(default_factory=_id)
    category: str
    title: str
    body: str
    image_url: str = ""
    pinned: bool = False
    locked: bool = False
    author_id: str
    author_nickname: str
    author_role: Role = "R1"
    reply_count: int = 0
    created_at: datetime = Field(default_factory=_now)


class ThreadCreate(BaseModel):
    category: str
    title: str = Field(min_length=3, max_length=120)
    body: str = Field(min_length=1)
    image_url: str = ""


class ForumPost(BaseModel):
    id: str = Field(default_factory=_id)
    thread_id: str
    body: str
    author_id: str
    author_nickname: str
    author_role: Role = "R1"
    created_at: datetime = Field(default_factory=_now)


class PostCreate(BaseModel):
    body: str = Field(min_length=1)


# ---------- events ----------
class Event(BaseModel):
    id: str = Field(default_factory=_id)
    title: str
    description: str = ""
    starts_at: datetime
    kind: Literal["governor_battle", "family_event", "custom"] = "custom"
    participants: list[str] = []
    participant_names: list[str] = []
    reminder_sent: bool = False


class EventCreate(BaseModel):
    title: str = Field(min_length=2)
    description: str = ""
    starts_at: datetime
    kind: Literal["governor_battle", "family_event", "custom"] = "custom"


# ---------- recruitment / attestation ----------
class Application(BaseModel):
    id: str = Field(default_factory=_id)
    nickname: str
    game_id: str
    city: str
    troop_type: str
    power: int = 0
    language: Lang = "ru"
    telegram: str = ""
    whatsapp: str = ""
    screenshot_url: str = ""
    status: Literal["pending", "reviewed", "approved", "rejected"] = "pending"
    reviewed_by: str | None = None
    approved_by: str | None = None
    interview_notes: str = ""
    history: list[dict] = []
    created_at: datetime = Field(default_factory=_now)


class ApplicationCreate(BaseModel):
    nickname: str = Field(min_length=2, max_length=24)
    game_id: str = Field(min_length=1, max_length=40)
    city: str = Field(min_length=1, max_length=60)
    troop_type: str = Field(min_length=1, max_length=40)
    power: int = Field(default=0, ge=0)
    language: Lang = "ru"
    telegram: str = ""
    whatsapp: str = ""
    screenshot_url: str = ""


class ApplicationReview(BaseModel):
    status: Literal["reviewed", "approved", "rejected"]
    interview_notes: str = ""


# ---------- penalties ----------
class Penalty(BaseModel):
    id: str = Field(default_factory=_id)
    member_id: str
    member_nickname: str
    kind: Literal["warning", "fine", "violation", "note"] = "warning"
    reason: str
    amount: int = 0
    issued_by: str
    created_at: datetime = Field(default_factory=_now)


class PenaltyCreate(BaseModel):
    member_id: str
    kind: Literal["warning", "fine", "violation", "note"] = "warning"
    reason: str = Field(min_length=2, max_length=400)
    amount: int = Field(default=0, ge=0)


# ---------- anonymous contact centre ----------
class Report(BaseModel):
    id: str = Field(default_factory=_id)
    category: Literal["complaint", "suggestion", "conflict", "leadership", "trucks", "bank", "other"]
    body: str
    anonymous: bool = True
    author_nickname: str = ""  # empty when anonymous — identity is never stored
    language: Lang = "ru"
    status: Literal["open", "closed"] = "open"
    reply: str = ""
    created_at: datetime = Field(default_factory=_now)


class ReportCreate(BaseModel):
    category: Literal["complaint", "suggestion", "conflict", "leadership", "trucks", "bank", "other"]
    body: str = Field(min_length=3, max_length=2000)
    anonymous: bool = True
    language: Lang = "ru"


class ReportReply(BaseModel):
    reply: str = Field(min_length=1, max_length=2000)
    status: Literal["open", "closed"] = "closed"


# ---------- diplomacy ----------
class DiplomacyEntry(BaseModel):
    id: str = Field(default_factory=_id)
    clan_name: str
    relation: Literal["ally", "enemy", "nap", "neutral"] = "neutral"
    leader_contact: str = ""
    notes: str = ""
    updated_by: str = ""
    updated_at: datetime = Field(default_factory=_now)


class DiplomacyCreate(BaseModel):
    clan_name: str = Field(min_length=1, max_length=60)
    relation: Literal["ally", "enemy", "nap", "neutral"] = "neutral"
    leader_contact: str = ""
    notes: str = ""


# ---------- audit ----------
class AuditEntry(BaseModel):
    id: str
    actor_id: str
    actor_nickname: str
    actor_role: str
    action: str
    module: str
    target: str
    details: str
    created_at: datetime


# ---------- AI ----------
class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    target_lang: Lang


class TranslateResponse(BaseModel):
    original: str
    translated: str
    target_lang: Lang


class TranslateBatchRequest(BaseModel):
    texts: list[str] = Field(max_length=50)
    target_lang: Lang


class TranslateBatchResponse(BaseModel):
    translated: list[str]
    target_lang: Lang


class AssistantRequest(BaseModel):
    question: str = Field(min_length=2, max_length=1000)
    lang: Lang = "ru"


class AssistantMessage(BaseModel):
    id: str = Field(default_factory=_id)
    user_id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime = Field(default_factory=_now)
