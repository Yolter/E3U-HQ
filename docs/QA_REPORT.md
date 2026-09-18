# QA report — E3U HQ production handoff

Environment: preview pod (FastAPI :8001 + Vite :3000 + MongoDB in-pod), seeded demo
database. Verified through the public ingress
`https://clan-headquarters.preview.emergentagent.com`.
Credentials: `memory/test_credentials.md` (all demo accounts: `e3u12345`).

## Automated gates

| Gate | Result |
|---|---|
| `yarn typecheck` (TS strict + i18n key completeness for ru/en/es/tr) | **PASS** — 0 errors |
| API smoke over the public URL (health, auth, RBAC negative, bank, AI) | **PASS** |
| Browser happy path (login → forum auto-translation → bank two-officer flow) | **PASS** — 0 console errors, 0 responses ≥ 400 |

## Module verification

| # | Module | Check | Result |
|---|---|---|---|
| 1 | Health | `GET /api/health` | `{"status":"ok","mongo":true}` |
| 2 | Auth | login 200 + httpOnly cookie; bad password → 401 `error.bad_credentials`; logout clears server session | PASS |
| 3 | Registration / attestation | new account created as R1 `pending`; invisible to member tools until R5 activates | PASS |
| 4 | RBAC R5 | Vulture (R5) reaches Command Center, audit log and every officer tool | PASS |
| 5 | RBAC R4 — Dima `bank_manager` | approves deposits and exports; `PATCH /api/members/{id}/role` → **403** | PASS |
| 6 | RBAC R4 — Maxim `truck_manager` | convoy create/attendance only; bank approval hidden and 403 server-side | PASS |
| 7 | RBAC R4 — Nyx `recruit_officer` | application queue + interview only | PASS |
| 8 | RBAC R4 — Sable `diplomat` | Diplomacy Center only | PASS |
| 9 | RBAC R3/R2/R1 | modules render read-only (`common.readOnly` notice), no mutation buttons | PASS |
| 10 | Two-officer bank approval | Dima's signature → `awaiting_second`; Dima again → **409** `error.second_officer_required`; Vulture → `approved`, `approved_by: "Dima + Vulture"`, contribution credited once | PASS |
| 11 | Bank UI | totals, resource chart, 14-day timeline, top contributors, search, resource/status filters (incl. *Awaiting 2nd officer*), `.xlsx` export | PASS |
| 12 | Trucks | create, join, capacity guard (`error.truck_full`), attendance, completion, per-member stats | PASS |
| 13 | Forum | 7 categories, thread create/reply, pin/lock/delete for `forum_moderator`/R5, search | PASS |
| 14 | Forum auto-translation | English announcement rendered in Russian on load with *Показать оригинал* toggle; header toggle switches auto mode; results cached server-side per message+language | PASS |
| 15 | Reports (anonymous) | anonymous submission stores no author; officer inbox + reply; body auto-translated | PASS |
| 16 | AI assistant | `POST /api/ai/chat` SSE streams and persists history; `GET /api/ai/status` reports the active provider | PASS |
| 17 | Translator API | `/api/ai/translate` EN→RU and `/api/ai/translate-batch` EN→ES both correct | PASS |
| 18 | Members | cards, role badges, online state, search/filter, penalties, R5 role + specialization assignment | PASS |
| 19 | Events | calendar, countdown, join, email reminders to participants | PASS |
| 20 | Recruitment | public application → officer review → R5 approval, append-only history | PASS |
| 21 | Diplomacy / Codex | entries CRUD for `diplomat`; encyclopedia readable by all ranks | PASS |
| 22 | Audit log | every privileged action recorded (incl. both bank signatures); R5-only, append-only | PASS |
| 23 | i18n | RU/EN/ES/TR complete; English dictionary defines the key union so a missing string fails `yarn typecheck`; no hardcoded English in the UI | PASS |
| 24 | Browser language detection | first visit picks a supported `navigator.languages` match, else Russian | PASS |
| 25 | Language persistence | choice stored in `localStorage` (`e3u.lang`); a member's saved `language` seeds the first load | PASS |
| 26 | Responsive | 390×844 mobile: nav scrolls horizontally, bank table scrolls, forms stack, 3D HQ scales; no overflow | PASS |
| 27 | Portability | `/api/ai/status` → provider switchable to `openai`; email switches to direct Resend via `RESEND_API_KEY`; no other Emergent dependency | PASS |

## Notes / known limitations

* **Placeholder media** (as requested until real assets arrive): `/intro.mp4`,
  `/ambient.mp3`, the E3U wordmark and the procedural `HQScene` geometry.
* Seeded `@e3u.gg` addresses are fake, so the provider rejects reset emails as
  undeliverable — the endpoint still returns 200 and logs the result. Real addresses
  deliver (verified with `delivered@resend.dev`).
* AI features need a key (`EMERGENT_LLM_KEY` **or** `OPENAI_API_KEY`). Without one,
  the assistant reports an error and auto-translate silently shows the original text.
* AI endpoints are authenticated but not per-user rate limited — watch provider spend.
