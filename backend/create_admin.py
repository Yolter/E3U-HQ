"""Create the first R5 (Leader) account — run once on a fresh database.

Usage (interactive):
    cd backend && python create_admin.py
Usage (non-interactive):
    ADMIN_EMAIL=me@clan.gg ADMIN_PASSWORD='Str0ng!pass' ADMIN_NICKNAME=Sable \
    python create_admin.py

Safe to re-run: an existing account with the same email is promoted to R5/active
and its password reset, instead of being duplicated.
"""

import asyncio
import os
import sys
from getpass import getpass

from lib.auth import hash_password
from lib.db import db
from models.schemas import UserPublic


async def main() -> int:
    email = (os.environ.get("ADMIN_EMAIL") or input("Email: ")).strip().lower()
    nickname = (os.environ.get("ADMIN_NICKNAME") or input("Nickname: ")).strip()
    password = os.environ.get("ADMIN_PASSWORD") or getpass("Password: ")
    city = (os.environ.get("ADMIN_CITY") or "").strip() or "HQ"
    language = (os.environ.get("ADMIN_LANGUAGE") or "ru").strip()

    if not email or "@" not in email or not nickname or len(password) < 6:
        print("Need a valid email, a nickname and a password of 6+ characters.")
        return 1

    if await db.users.find_one({"email": email}):
        await db.users.update_one(
            {"email": email},
            {
                "$set": {
                    "role": "R5",
                    "status": "active",
                    "officer_roles": [],
                    "password": hash_password(password),
                }
            },
        )
        print(f"Existing account {email} promoted to R5 (password reset).")
        return 0

    user = UserPublic(
        nickname=nickname,
        email=email,
        city=city,
        language=language,  # type: ignore[arg-type]
        role="R5",
        status="active",
        avatar_seed=nickname,
    )
    doc = user.model_dump()
    doc["password"] = hash_password(password)
    await db.users.insert_one(doc)
    print(f"R5 leader created: {nickname} <{email}>")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
