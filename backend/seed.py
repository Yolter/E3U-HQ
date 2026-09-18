"""Idempotent seed for E3U HQ. Run: cd /app/backend && python seed.py"""

import asyncio
from datetime import datetime, timedelta, timezone

from lib.auth import hash_password
from lib.db import db, ensure_indexes
from models.schemas import (
    Application,
    DiplomacyEntry,
    Donation,
    Event,
    ForumThread,
    Penalty,
    Report,
    Truck,
    UserPublic,
)

NOW = datetime.now(timezone.utc)

# nickname, email, role, city, lang, title, officer_roles, contribution, activity
MEMBERS = [
    ("Vulture", "vulture@e3u.gg", "R5", "Moscow", "ru", "Leader", [], 182000, 96),
    ("Dima", "dima@e3u.gg", "R4", "Saint Petersburg", "ru", "Bank Manager", ["bank_manager"], 141500, 88),
    ("Maxim", "maxim@e3u.gg", "R4", "Kazan", "ru", "Truck Manager", ["truck_manager"], 120300, 81),
    ("Nyx", "nyx@e3u.gg", "R4", "Berlin", "en", "Recruit Officer", ["recruit_officer"], 98400, 79),
    ("Sable", "sable@e3u.gg", "R4", "Istanbul", "tr", "Diplomat", ["diplomat"], 91200, 76),
    ("Corvo", "corvo@e3u.gg", "R4", "Madrid", "es", "Forum Moderator", ["forum_moderator"], 87700, 74),
    ("Kaido", "kaido@e3u.gg", "R4", "Osaka", "en", "Event Officer", ["event_officer"], 84100, 72),
    ("Mira", "mira@e3u.gg", "R3", "Lisbon", "es", "", 38900, 45),
    ("Rook", "rook@e3u.gg", "R2", "Kyiv", "ru", "", 22400, 31),
    ("Pyro", "pyro@e3u.gg", "R1", "Ankara", "tr", "", 8200, 18),
]


async def main() -> None:
    for coll in (
        "users", "sessions", "password_resets", "donations", "trucks", "forum_threads",
        "forum_posts", "events", "applications", "penalties", "reports", "diplomacy",
        "audit_log", "ai_messages",
    ):
        await db[coll].drop()
    await ensure_indexes()

    users: list[UserPublic] = []
    for i, row in enumerate(MEMBERS):
        nick, email, role, city, lang, title, *rest = row
        if len(rest) == 3:
            officer_roles, contrib, activity = rest
        else:
            officer_roles, contrib, activity = [], rest[0], rest[1]
        u = UserPublic(
            nickname=nick, email=email, role=role, city=city, language=lang, title=title,
            officer_roles=officer_roles, contribution=contrib, activity=activity,
            status="active", online=i % 2 == 0, avatar_seed=nick,
            game_id=f"GM{100200 + i * 37}", troop_type=["Brawler", "Gunner", "Biker"][i % 3],
            power=1_200_000 + i * 145_000, truck_count=(i * 3) % 11,
            joined_at=NOW - timedelta(days=260 - i * 19),
        )
        doc = u.model_dump()
        doc["password"] = hash_password("e3u12345")
        await db.users.insert_one(doc)
        users.append(u)

    resources = ["cash", "arms", "cargo", "diamonds"]
    for i in range(30):
        u = users[i % len(users)]
        approved = i % 4 != 0
        d = Donation(
            player_id=u.id, player_nickname=u.nickname, resource=resources[i % 4],
            amount=(i + 1) * 1750, notes="Weekly tribute" if i % 3 == 0 else "",
            status="approved" if approved else "pending",
            approved_by="Dima" if approved else None,
            created_at=NOW - timedelta(days=29 - i, hours=i),
        )
        await db.donations.insert_one(d.model_dump())

    for i in range(6):
        parts = [users[i].id, users[(i + 3) % len(users)].id]
        names = [users[i].nickname, users[(i + 3) % len(users)].nickname]
        t = Truck(
            title=f"Convoy Run #{i + 1}",
            scheduled_for=NOW + timedelta(days=i - 1, hours=3),
            route=["Docks → Vault", "Uptown Loop", "Border Crossing", "Night Market", "Old Refinery", "Harbour Spur"][i],
            capacity=5, participants=parts, participant_names=names,
            attended=parts if i == 0 else [], completed=i == 0, created_by="Maxim",
        )
        await db.trucks.insert_one(t.model_dump())

    threads = [
        ("announcements", "E3U HQ is live", "Welcome to the new clan headquarters. Read the clan rules.", True),
        ("recruitment", "Recruiting active R2+", "We want daily players. Apply via the recruitment centre.", False),
        ("guides", "Truck routing basics", "Always stack convoys before reset.", False),
        ("diplomacy", "NAP with Red Harbour", "Non-aggression pact agreed for this season.", False),
        ("questions", "Which formation vs Gunners?", "Use 4/3/3 and lead with Brawlers.", False),
        ("strategy", "Turf war rotation", "Split into three squads and rotate every 20 minutes.", False),
        ("reports", "Weekly bank report", "Cash and arms up, cargo flat.", False),
        ("general", "Say hello", "Introduce yourself here.", False),
    ]
    for i, (cat, title, body, pinned) in enumerate(threads):
        u = users[i % len(users)]
        th = ForumThread(
            category=cat, title=title, body=body, pinned=pinned, author_id=u.id,
            author_nickname=u.nickname, author_role=u.role, created_at=NOW - timedelta(days=i),
        )
        await db.forum_threads.insert_one(th.model_dump())

    for i, (title, kind, days) in enumerate(
        [
            ("Governor Battle", "governor_battle", 2),
            ("Family Event: Cargo Rush", "family_event", 5),
            ("Recruitment Drive", "custom", 9),
        ]
    ):
        e = Event(
            title=title, kind=kind, description=f"{title} — be online 15 minutes early.",
            starts_at=NOW + timedelta(days=days, hours=i),
            participants=[users[i].id], participant_names=[users[i].nickname],
        )
        await db.events.insert_one(e.model_dump())

    for i, (nick, city, troop, status) in enumerate(
        [
            ("Falcon", "Baku", "Gunner", "pending"),
            ("Zeta", "Bogota", "Biker", "pending"),
            ("Hawk", "Izmir", "Brawler", "reviewed"),
        ]
    ):
        app = Application(
            nickname=nick, game_id=f"GM{770100 + i * 13}", city=city, troop_type=troop,
            power=900_000 + i * 220_000, language=["ru", "es", "tr"][i],
            telegram=f"@{nick.lower()}", status=status,
            reviewed_by="Nyx" if status == "reviewed" else None,
            history=[{"at": NOW - timedelta(days=i), "by": nick, "role": "applicant", "status": "pending", "notes": ""}],
            created_at=NOW - timedelta(days=i, hours=2),
        )
        await db.applications.insert_one(app.model_dump())

    await db.penalties.insert_one(
        Penalty(
            member_id=users[-1].id, member_nickname=users[-1].nickname, kind="warning",
            reason="Missed two scheduled convoys without notice.", issued_by="Maxim",
            created_at=NOW - timedelta(days=3),
        ).model_dump()
    )
    await db.users.update_one({"id": users[-1].id}, {"$set": {"warning_count": 1}})

    await db.reports.insert_one(
        Report(
            category="suggestion", body="Please schedule convoys 30 minutes later on weekdays.",
            anonymous=True, language="ru", created_at=NOW - timedelta(days=1),
        ).model_dump()
    )

    for name, relation, contact, notes in [
        ("Red Harbour", "nap", "@redharbour_lead", "NAP until season end."),
        ("Iron Syndicate", "ally", "@iron_lead", "Shares turf intel."),
        ("Black Vipers", "enemy", "", "Hits our convoys at reset."),
    ]:
        await db.diplomacy.insert_one(
            DiplomacyEntry(
                clan_name=name, relation=relation, leader_contact=contact, notes=notes,
                updated_by="Sable",
            ).model_dump()
        )

    print("seeded", await db.users.count_documents({}), "members")


if __name__ == "__main__":
    asyncio.run(main())
