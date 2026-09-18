# First R5 (Leader) account

The app has **no public path to R5** — registration always produces a `pending` R1
account. The first leader is created from the server.

## Create it

```bash
cd backend
python create_admin.py                       # interactive prompts
# or non-interactive:
ADMIN_EMAIL=you@clan.gg ADMIN_NICKNAME=Sable ADMIN_PASSWORD='Str0ng!pass' \
ADMIN_CITY='Milan' ADMIN_LANGUAGE=ru python create_admin.py
```

On Render: **Shell** tab → `cd backend && python create_admin.py`
(free plan has no shell → run it once locally against the same Atlas `MONGO_URL`).

Re-running with an existing email promotes that account to R5/active and resets its
password — this is also the recovery path if you lose leader access.

## Then, in the UI

1. Sign in → **Command Center** (`/admin`, R5 only).
2. **Members** → approve pending registrations (`pending → active`).
3. Set each member's rank (R1–R5) and, for R4, tick their specializations:

| Officer | Specialization | Unlocks (and nothing else) |
|---|---|---|
| Dima | `bank_manager` | Bank approve / report / export |
| Maxim | `truck_manager` | Truck manage / attendance / report |
| Recruiter | `recruit_officer` | Recruitment review / interview |
| Diplomat | `diplomat` | Diplomacy view / manage |
| Moderator | `forum_moderator` | Forum moderate / pin |
| Event officer | `event_officer` | Events manage / remind |

R5-only powers stay with you: recruit approval, member management, role assignment,
audit log, admin panel, and the second signature on bank approvals.

## Housekeeping

* `backend/seed.py` populates demo data — **do not run it on production**.
* Rotate the demo accounts (`memory/test_credentials.md`) out of any production DB:
  `db.users.deleteMany({email: /@e3u\.gg$/})`.
