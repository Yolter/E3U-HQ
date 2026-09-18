import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from lib.audit import log_action
from lib.auth import can, current_user, require
from lib.db import db
from models.schemas import BankSummary, Donation, DonationCreate, DonationReview

router = APIRouter(prefix="/bank", tags=["bank"])

RESOURCES = ["cash", "arms", "cargo", "diamonds"]


@router.get("/donations", response_model=list[Donation])
async def list_donations(resource: str = "", status: str = "", q: str = "", _: dict = Depends(current_user)):
    query: dict = {}
    if resource:
        query["resource"] = resource
    if status:
        query["status"] = status
    if q:
        query["player_nickname"] = {"$regex": q, "$options": "i"}
    docs = await db.donations.find(query, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return [Donation(**d) for d in docs]


@router.post("/donations", response_model=Donation)
async def create_donation(payload: DonationCreate, user: dict = Depends(require("bank.donate"))):
    donation = Donation(
        player_id=user["id"],
        player_nickname=user["nickname"],
        resource=payload.resource,
        amount=payload.amount,
        notes=payload.notes,
    )
    await db.donations.insert_one(donation.model_dump())
    await log_action(user, "bank.deposit_logged", donation.id, f"{payload.resource} {payload.amount}", "bank")
    return donation


@router.patch("/donations/{donation_id}", response_model=Donation)
async def review_donation(
    donation_id: str, payload: DonationReview, user: dict = Depends(require("bank.approve"))
):
    """Two-officer approval: the first signature moves a deposit to
    `awaiting_second`; a *different* officer's signature approves it and credits the
    contribution. A rejection is single-signature and final at any stage."""
    doc = await db.donations.find_one({"id": donation_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.donation_not_found")
    if doc.get("status") == "approved":
        raise HTTPException(status_code=409, detail="error.already_approved")

    if payload.status == "rejected":
        await db.donations.update_one(
            {"id": donation_id},
            {"$set": {"status": "rejected", "approved_by": user["nickname"]}},
        )
        action = "bank.donation_rejected"
    else:
        first = doc.get("first_approved_by")
        if not first:
            await db.donations.update_one(
                {"id": donation_id},
                {
                    "$set": {
                        "status": "awaiting_second",
                        "first_approved_by": user["nickname"],
                        "approved_by": user["nickname"],
                    }
                },
            )
            action = "bank.donation_first_signature"
        else:
            if first == user["nickname"]:
                raise HTTPException(status_code=409, detail="error.second_officer_required")
            await db.donations.update_one(
                {"id": donation_id},
                {
                    "$set": {
                        "status": "approved",
                        "second_approved_by": user["nickname"],
                        "approved_by": f"{first} + {user['nickname']}",
                    }
                },
            )
            await db.users.update_one(
                {"id": doc["player_id"]},
                {"$inc": {"contribution": int(doc["amount"]), "activity": 1}},
            )
            action = "bank.donation_approved"

    await log_action(
        user,
        action,
        doc["player_nickname"],
        f"{doc['resource']} {doc['amount']}",
        "bank",
    )
    updated = await db.donations.find_one({"id": donation_id}, {"_id": 0})
    return Donation(**updated)


@router.get("/summary", response_model=BankSummary)
async def summary(_: dict = Depends(current_user)):
    docs = await db.donations.find({}, {"_id": 0}).to_list(5000)
    totals = {r: 0 for r in RESOURCES}
    by_player: dict[str, int] = {}
    by_day: dict[str, int] = {}
    pending = approved = 0
    for d in docs:
        if d.get("status") == "approved":
            approved += 1
            totals[d["resource"]] = totals.get(d["resource"], 0) + int(d["amount"])
            by_player[d["player_nickname"]] = by_player.get(d["player_nickname"], 0) + int(d["amount"])
            created = d["created_at"]
            day = (created if isinstance(created, datetime) else datetime.now(timezone.utc)).strftime("%Y-%m-%d")
            by_day[day] = by_day.get(day, 0) + int(d["amount"])
        elif d.get("status") == "pending":
            pending += 1
    top = sorted(by_player.items(), key=lambda kv: -kv[1])[:5]
    timeline = [{"day": d, "amount": a} for d, a in sorted(by_day.items())][-14:]
    return BankSummary(
        totals=totals,
        pending_count=pending,
        approved_count=approved,
        top_contributors=[{"nickname": n, "amount": a} for n, a in top],
        timeline=timeline,
    )


@router.get("/export")
async def export_excel(user: dict = Depends(current_user)):
    """Real .xlsx export of the donation ledger (openpyxl)."""
    if not can(user, "bank.export") and not can(user, "bank.report"):
        raise HTTPException(status_code=403, detail="error.forbidden:bank.export")
    from openpyxl import Workbook

    docs = await db.donations.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    wb = Workbook()
    ws = wb.active
    ws.title = "Donations"
    ws.append(["Player", "Resource", "Amount", "Status", "Approved by", "Date", "Notes"])
    for d in docs:
        created = d.get("created_at")
        ws.append(
            [
                d.get("player_nickname", ""),
                d.get("resource", ""),
                int(d.get("amount", 0)),
                d.get("status", ""),
                d.get("approved_by") or "",
                created.strftime("%Y-%m-%d %H:%M") if isinstance(created, datetime) else "",
                d.get("notes", ""),
            ]
        )
    for col, width in zip("ABCDEFG", (18, 12, 14, 12, 16, 20, 40)):
        ws.column_dimensions[col].width = width
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    await log_action(user, "bank.exported", "donations.xlsx", f"{len(docs)} rows", "bank")
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="e3u-bank.xlsx"'},
    )
