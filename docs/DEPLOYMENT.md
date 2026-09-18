# E3U HQ — Deployment & Export Guide

Everything below runs on free tiers and **requires no Emergent service**:
Cloudflare Pages (frontend) + Render (API) + MongoDB Atlas (database) + your own
OpenAI and Resend keys.

```
Browser ──► Cloudflare Pages (static React build)
                │  fetch https://e3u-hq-api.onrender.com/api/...
                ▼
            Render Web Service (FastAPI, uvicorn)
                │  motor
                ▼
            MongoDB Atlas (M0 free cluster)
```

---

## 1. One-command local setup

```bash
git clone https://github.com/<you>/e3u-hq.git && cd e3u-hq
cp backend/.env.example backend/.env   # fill MONGO_URL + keys
make dev                               # or: ./scripts/dev.sh
```

`make dev` installs both dependency sets, starts the API on :8001 and Vite on :3000.
Then create your leader account:

```bash
cd backend && python create_admin.py
```

---

## 2. MongoDB Atlas (free M0)

1. <https://cloud.mongodb.com> → **Create** → **M0 Free** → pick a region near your
   API region (e.g. Frankfurt for Render EU).
2. **Database Access** → *Add New Database User* → username `e3u`, strong password,
   role **Read and write to any database**.
3. **Network Access** → *Add IP Address* → `0.0.0.0/0` (Render's egress IPs are
   dynamic on the free plan). Keep the user password strong; this is the only guard.
4. **Connect** → *Drivers* → copy the SRV string:
   `mongodb+srv://e3u:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
5. Set it as `MONGO_URL`, and `DB_NAME=e3u_hq`.
6. Collections are created on first write — no migrations. Recommended indexes
   (Atlas → Collections → Indexes), all optional but nice at scale:
   `users.email` (unique), `users.nickname` (unique), `sessions.token`,
   `sessions.expires_at` (TTL, expireAfterSeconds 0), `password_resets.expires_at`
   (TTL 0), `donations.created_at`, `audit_log.created_at`.

---

## 3. Backend → Render (free)

Option A — blueprint: the repo ships `render.yaml`. Render → **New +** →
**Blueprint** → select the repo → fill the `sync: false` secrets.

Option B — manual web service:

| Field | Value |
|---|---|
| Root directory | `backend` |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| Health check | `/api/health` |

Environment variables: see `backend/.env.example` (and §6 below). Critical for a
split-origin deploy:

* `CORS_ORIGINS=https://<your-pages-domain>` (exact origin, no trailing slash)
* `APP_URL=https://<your-pages-domain>`
* `COOKIE_SAMESITE=none` — the session cookie is cross-site, so it must be
  `SameSite=None; Secure`. Both hosts are HTTPS, so this works out of the box.

Free Render instances sleep after ~15 min idle; the first request wakes them
(~30 s). A cron ping (e.g. cron-job.org hitting `/api/health` every 10 min) keeps
it warm.

Docker alternative: `backend/Dockerfile` runs anywhere (Fly.io, Railway, VPS).

---

## 4. Frontend → Cloudflare Pages (free)

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → *Connect to Git*:

| Field | Value |
|---|---|
| Framework preset | Vite |
| Build command | `yarn install --frozen-lockfile && yarn build` |
| Build output directory | `dist` |
| Root directory | `frontend` |
| Node version | `20` (env var `NODE_VERSION=20`) |

Environment variable (Production **and** Preview):

```
VITE_API_URL = https://e3u-hq-api.onrender.com
```

`frontend/public/_redirects` ships the SPA fallback (`/* /index.html 200`), so deep
links such as `/forum/<id>` survive a hard refresh.

Same-origin alternative: leave `VITE_API_URL` empty and put both behind one proxy
(Nginx/Caddy: `/api → :8001`, everything else → the static `dist`). Then the cookie
stays first-party and `COOKIE_SAMESITE=lax`.

---

## 5. First R5 admin

See `docs/ADMIN_SETUP.md`.

---

## 6. Environment variables

| Variable | Where | Required | Notes |
|---|---|---|---|
| `MONGO_URL` | backend | ✅ | Atlas SRV string |
| `DB_NAME` | backend | ✅ | `e3u_hq` |
| `CORS_ORIGINS` | backend | ✅ | comma-separated exact origins |
| `APP_URL` | backend | ✅ | used in email links |
| `COOKIE_SAMESITE` | backend | split-origin | `none` for cross-site, else `lax` |
| `OPENAI_API_KEY` | backend | AI features | portable provider for assistant + translator |
| `OPENAI_MODEL` | backend | – | default `gpt-4o-mini` |
| `OPENAI_BASE_URL` | backend | – | any OpenAI-compatible gateway |
| `EMERGENT_LLM_KEY` | backend | – | Emergent-only alternative to `OPENAI_API_KEY` |
| `RESEND_API_KEY` | backend | email | from <https://resend.com/api-keys> |
| `EMAIL_FROM` | backend | email | `Name <addr@verified-domain>` |
| `EMAIL_FROM_NAME` | backend | – | display name |
| `EMAIL_REPLY_TO` | backend | – | optional reply-to |
| `EMERGENT_EMAIL_KEY` | backend | – | Emergent-only alternative to `RESEND_API_KEY` |
| `VITE_API_URL` | frontend | split-origin | API origin without `/api` |

Missing AI keys degrade gracefully: the assistant returns an error message and
auto-translate silently falls back to the original text. Missing email keys only
affect password-reset and event-reminder emails.

---

## 7. GitHub export

```bash
cd /app
git init -b main                 # if not already a repo
git remote add origin git@github.com:<you>/e3u-hq.git
git add -A && git commit -m "E3U HQ"
git push -u origin main
```

`.gitignore` already excludes `node_modules/`, `.env`, `__pycache__/`, `dist/`.
Verify before pushing: `git grep -nE "sk-|re_[A-Za-z0-9]" -- . ':!*.md'` returns
nothing.

---

## 8. Post-deploy smoke test

```bash
API=https://e3u-hq-api.onrender.com
curl -s $API/api/health
curl -s -o /dev/null -w '%{http_code}\n' $API/api/members        # 401 expected
curl -s -X POST $API/api/auth/login -H 'Content-Type: application/json' \
     -d '{"email":"you@clan.gg","password":"...","remember":true}' -i | head -20
```

Then in the browser: intro → 3D HQ → login → Bank → deposit → approve →
Forum thread (auto-translated) → logout.
