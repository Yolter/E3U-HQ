# E3U HQ

Clan operating system for a **The Grand Mafia** family — cinematic 3D headquarters,
rank-based command structure, clan bank with two-officer approval, convoy scheduling,
forum with automatic translation, events, recruitment, diplomacy, battle codex,
anonymous reports, audit log and an in-game AI assistant. Russian, English, Spanish
and Turkish out of the box.

* **Frontend** React 19 + Vite + TypeScript (strict) + Tailwind v4 + shadcn/ui +
  Framer Motion + React Three Fiber + TanStack Query
* **Backend** FastAPI + Pydantic v2 + motor (async MongoDB)
* **Database** MongoDB (local or Atlas M0 free)
* **Optional services** any OpenAI-compatible LLM key (assistant + translator),
  Resend (password-reset and event-reminder email)

No vendor lock-in: the app runs on Cloudflare Pages + Render + MongoDB Atlas free
tiers with your own keys — see `docs/DEPLOYMENT.md`.

---

## Quick start

```bash
git clone <your-repo> e3u-hq && cd e3u-hq
cp backend/.env.example backend/.env       # set MONGO_URL, DB_NAME, keys
make dev                                   # API :8001 + web :3000
make admin                                 # create the first R5 leader
```

Optional demo data: `make seed` (never on production).

## Project layout

```
backend/
  server.py            FastAPI app; every route lives on api_router under /api
  routers/             auth, members, bank, trucks, forum, events, recruitment,
                       reports, diplomacy, audit, ai, encyclopedia, admin
  models/schemas.py    Pydantic v2 models (mirrored by frontend/src/lib/types.ts)
  lib/                 db, auth/RBAC, emailer, audit, ai providers, dates
  create_admin.py      first R5 account          seed.py  demo data
frontend/src/
  pages/               one page per module
  components/e3u/      AppShell, HQScene (3D), Intro, I18nProvider, shared UI
  components/ui/       shadcn/ui primitives
  lib/                 api (typed fetch), i18n (4 dictionaries), permissions,
                       autoTranslate, session, types
docs/                  DEPLOYMENT, ADMIN_SETUP, SECURITY, QA_REPORT
```

## Conventions

* Every endpoint is registered on `api_router` (prefix `/api`); `app.include_router`
  stays the last statement in `server.py`.
* The frontend only calls relative `/api/...` paths through `src/lib/api.ts`
  (`VITE_API_URL` makes that absolute for split-origin hosting).
* Each Pydantic model has a hand-written TS interface in `src/lib/types.ts` — change
  both in the same commit.
* All UI strings go through `t()` from `useI18n()`; the English dictionary defines the
  key union, so a missing translation is a **type error** (`yarn typecheck`).
* Permissions are enforced server-side with `require("<permission>")`;
  `src/lib/permissions.ts` is the UI mirror.

## Ranks & officer specializations

R1 Recruit · R2 Member · R3 Veteran · R4 Officer · R5 Leader.
An R4 only sees the tools for their assigned specialization
(`bank_manager`, `truck_manager`, `recruit_officer`, `diplomat`, `forum_moderator`,
`event_officer`); R5 holds everything. Details: `docs/ADMIN_SETUP.md`.

## Docs

| File | Contents |
|---|---|
| `docs/DEPLOYMENT.md` | Cloudflare Pages + Render + MongoDB Atlas, env var table, GitHub export |
| `docs/ADMIN_SETUP.md` | first R5 account, approving members, assigning specializations |
| `docs/SECURITY.md` | security posture and pre-launch checklist |
| `docs/QA_REPORT.md` | module-by-module verification results |
| `memory/SPEC.md` | living functional spec (data model, flows) |
| `memory/test_credentials.md` | demo accounts for the seeded database |

## Scripts

| Command | Purpose |
|---|---|
| `make dev` | install everything, run API + web |
| `make admin` / `make seed` | create R5 / load demo data |
| `cd frontend && yarn typecheck` | TypeScript gate (includes i18n completeness) |
| `cd frontend && yarn build` | production bundle in `frontend/dist` |
| `cd backend && python -m pytest -q` | backend tests |
