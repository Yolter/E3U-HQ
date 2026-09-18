# E3U HQ — living spec

Production clan operating system for a **The Grand Mafia** clan. Black/gold theme,
cinematic intro, React Three Fiber 3D HQ as the main menu.
Stack: FastAPI + MongoDB (motor) + Vite/React 19/TS/Tailwind v4. No Firebase —
auth is an httpOnly cookie session (`e3u_session`, 1 day, 30 days with "remember me").

## RBAC (backend/lib/auth.py ↔ frontend/src/lib/permissions.ts — mirror in one edit)
Ranks: R1 Recruit, R2 Member, R3 Veteran, R4 Officer, R5 Leader.
A permission needs its minimum rank AND, for officer tools below R5, an assigned
**specialization**. R5 implicitly holds everything. R1–R3 get read-only module views.

Specializations → permissions:
- `bank_manager` → bank.approve/report/export
- `truck_manager` → trucks.manage/attendance/report
- `recruit_officer` → recruit.review/interview
- `diplomat` → diplomacy.view/manage
- `forum_moderator` → forum.moderate/pin
- `event_officer` → events.manage/remind
R5 only: recruit.approve, members.manage, roles.manage, audit.view, admin.access.
R5 assigns rank + multiple specializations per member in the Command Center.

## Data model (backend/models/schemas.py ↔ frontend/src/lib/types.ts)
`users` (role, officer_roles[], status pending|active|rejected, game_id, troop_type,
power, telegram, whatsapp, contribution, activity, truck_count, warning_count),
`sessions`, `password_resets` (TTL), `donations`, `trucks` (participants[], attended[]),
`forum_threads` (pinned, locked, image_url) / `forum_posts`, `events`
(governor_battle|family_event|custom), `applications` (+append-only `history[]`),
`penalties`, `reports` (anonymous never stores author), `diplomacy`, `audit_log`
(append-only), `ai_messages`.

## API (all on api_router under /api)
auth: register, login, logout, me, permissions, forgot-password, reset-password,
settings (PUT), password (PUT).
members: list/get, /specializations, `{id}/role`, `{id}/status`, `{id}/penalties`,
penalties/all, penalties (POST).
bank: donations (GET/POST), donations/{id} (PATCH — **two-officer approval**: first
signature → `awaiting_second`, a *different* officer's signature → `approved`
(`approved_by: "A + B"`, contribution credited once); same officer twice → 409
`error.second_officer_required`), summary, export (.xlsx via openpyxl).
health: `GET /api/health` → `{status, mongo}` (uptime/Render probe).
ai: translate, **translate-batch**, status (active LLM provider), chat (SSE), history.
trucks: list, stats, create, {id}/join, {id}/complete, {id}/attendance, delete.
forum: categories, threads (search/pin/lock/delete), threads/{id}/posts, posts/{id}.
events: list/create/join/delete, {id}/remind (Resend emails to participants).
applications: submit (public), list, mine, {id} (review → R4 reviewed, R5 approved),
queue/pending. reports, diplomacy, audit, encyclopedia, ai (translate + /ai/chat SSE),
admin/overview.

## i18n
`frontend/src/lib/i18n.ts` — 4 complete dictionaries (ru default, en, es, tr). `en`
defines `TranslationKey`, so a missing key in another language is a **type error**.
Backend errors are translation keys (`error.email_taken`) resolved by `tError()`.
Choice persists in `localStorage` (`e3u.lang`); on a first visit `navigator.languages`
is matched against the four supported locales before falling back to Russian; a
member's stored `language` seeds the first load of a new browser.

**Auto-translation**: `frontend/src/lib/autoTranslate.ts` holds the preference
(`e3u.autoTranslate`, default ON, toggled from the header button
`auto-translate-toggle`). `TranslatableText` translates every user-authored message
(forum bodies, replies, reports) into the active language on load and keeps
"show original" one click away. Translations are cached server-side in the
`translations` collection keyed by sha256(target_lang + text), so a busy forum costs
one model call per unique message+language.

## Integrations
- **Resend** (Emergent-managed) via `lib/emailer.py`: password reset + event reminders.
  Server-side templates only; `_assert_safe_email` gates every send. Forgot-password
  always returns 200 (never leaks account existence), delivery result goes to the audit log.
  NOTE: seeded `@e3u.gg` addresses are fake and rejected by the provider as undeliverable;
  real addresses deliver (verified with `delivered@resend.dev`).
- **Emergent LLM key** (`gpt-5.4` via emergentintegrations): AI assistant (SSE streaming,
  persisted history) and one-click translator on forum posts/replies/reports.

## Key flows
intro → 3D HQ → register (pending) → officer review → R5 approval/activation;
deposit → officer approval → contribution; truck join → attendance → stats;
forum with pin/lock/moderation + translation; events with countdown + email reminders;
anonymous contact centre → officer inbox reply; every privileged action → audit log.

## Seed
`cd /app/backend && python seed.py` — 10 members (one per specialization), 30 donations,
6 trucks, 8 threads, 3 events, 3 applications, penalties, report, 3 diplomacy entries.
Credentials: `memory/test_credentials.md`.

## Portability / export (no Emergent dependency)
Two provider paths everywhere a third party is used, selected from the environment:
- LLM: `EMERGENT_LLM_KEY` (emergentintegrations) **or** `OPENAI_API_KEY`
  (+`OPENAI_MODEL`/`OPENAI_BASE_URL`, direct REST in `lib/ai.py`).
- Email: `EMERGENT_EMAIL_KEY` (managed relay) **or** `RESEND_API_KEY` + `EMAIL_FROM`
  (direct `api.resend.com` in `lib/emailer.py`).
Frontend calls stay relative unless `VITE_API_URL` is set (Cloudflare Pages + Render
split origin); `credentials: "include"` + `COOKIE_SAMESITE=none` make the session
cookie work cross-site. `apiUrl()` covers the SSE chat stream and the .xlsx link.
Artifacts: `render.yaml`, `backend/Dockerfile`, `frontend/public/_redirects`,
`Makefile` + `scripts/dev.sh`, `backend/create_admin.py`, `*.env.example`,
`docs/{DEPLOYMENT,ADMIN_SETUP,SECURITY,QA_REPORT}.md`, root `README.md`.

## Placeholders
`/intro.mp4`, `/ambient.mp3`, E3U wordmark, `HQScene.tsx` `<Tower/>` geometry.
