"""Anonymous contact centre. Anonymous submissions never store the author."""

from fastapi import APIRouter, Depends, HTTPException

from lib.audit import log_action
from lib.auth import current_user, optional_user, require
from lib.db import db
from models.schemas import Report, ReportCreate, ReportReply

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("", response_model=Report)
async def create_report(payload: ReportCreate, user: dict | None = Depends(optional_user)):
    report = Report(
        category=payload.category,
        body=payload.body,
        anonymous=payload.anonymous,
        language=payload.language,
        # Identity is only ever persisted when the sender explicitly opted out of anonymity.
        author_nickname="" if payload.anonymous or not user else user["nickname"],
    )
    await db.reports.insert_one(report.model_dump())
    await log_action(
        None if payload.anonymous else user,
        "report.submitted",
        payload.category,
        "anonymous" if payload.anonymous else "named",
        "reports",
    )
    return report


@router.get("", response_model=list[Report])
async def list_reports(status: str = "", _: dict = Depends(require("reports.read"))):
    query = {"status": status} if status else {}
    docs = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Report(**d) for d in docs]


@router.get("/mine", response_model=list[Report])
async def my_reports(user: dict = Depends(current_user)):
    docs = await db.reports.find({"author_nickname": user["nickname"]}, {"_id": 0}).to_list(100)
    return [Report(**d) for d in docs]


@router.patch("/{report_id}", response_model=Report)
async def reply_report(report_id: str, payload: ReportReply, user: dict = Depends(require("reports.read"))):
    doc = await db.reports.find_one({"id": report_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.report_not_found")
    await db.reports.update_one(
        {"id": report_id}, {"$set": {"reply": payload.reply, "status": payload.status}}
    )
    await log_action(user, "report.answered", doc["category"], payload.status, "reports")
    updated = await db.reports.find_one({"id": report_id}, {"_id": 0})
    return Report(**updated)
