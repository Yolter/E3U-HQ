# Security checklist — E3U HQ

## What the app already does

| Area | Implementation |
|---|---|
| Passwords | PBKDF2-HMAC-SHA256 with a per-user random salt (`backend/lib/auth.py`); never logged, never returned by any endpoint |
| Sessions | Opaque UUID token in an **httpOnly** cookie (`e3u_session`), server-side `sessions` collection with an expiry; `Secure` when `APP_URL` is HTTPS or `COOKIE_SAMESITE=none`; logout deletes the server record |
| CSRF | `SameSite=Lax` same-origin deploys; cross-origin deploys rely on an explicit `CORS_ORIGINS` allow-list (no wildcard with credentials) |
| Authorization | Every privileged route is wrapped in `require("<permission>")` — rank **and** officer specialization are checked server-side; the frontend `permissions.ts` mirror is convenience only |
| Escalation | No endpoint can grant R5; role/status changes require `roles.manage` / `members.manage` (R5 only) |
| Bank integrity | Two different officers must sign a deposit before contribution is credited; every signature is in the audit log |
| Audit | `audit_log` is append-only, R5-readable, records actor, action, target, module, timestamp |
| Anonymous reports | Author identity is never stored for anonymous submissions |
| Email | Server-side templates only; `_assert_safe_email` blocks credential-asking copy, link shorteners and mismatched anchor hosts; forgot-password always answers 200 so account existence never leaks; reset tokens are single-use with a TTL |
| Input validation | Pydantic v2 models with length/range constraints on every request body |
| Error surface | Backend returns translation keys (`error.*`), never stack traces |

## Before you go live

1. Rotate every key that ever touched a shared environment; store secrets only in the
   host's env UI (Render/Cloudflare), never in git.
2. Set `CORS_ORIGINS` to your exact frontend origin(s). Never `*` with credentials.
3. Set `COOKIE_SAMESITE=none` **only** on HTTPS split-origin deploys; otherwise `lax`.
4. Delete the demo data: `python seed.py` output and every `@e3u.gg` account
   (`db.users.deleteMany({email:/@e3u\.gg$/})`).
5. Create your own R5 with a 16+ character password (`docs/ADMIN_SETUP.md`).
6. MongoDB Atlas: dedicated DB user, strong password, and Atlas backups enabled.
   Restrict Network Access to known IPs if your host offers static egress.
7. Verify your Resend sending domain (SPF + DKIM) so reset emails are not spam.
8. Add the TTL indexes from `docs/DEPLOYMENT.md` §2 so expired sessions and reset
   tokens are purged automatically.
9. Put the API behind the host's rate limiting (Cloudflare rules / Render) —
   login and forgot-password are the endpoints worth throttling.
10. `git grep -nE "sk-|re_[A-Za-z0-9]{10}"` must return nothing before pushing.

## Known limitations (by design, MVP)

* No 2FA and no email verification on registration — accounts start `pending` and an
  officer must activate them, which covers clan-scale abuse.
* No file uploads; forum images are URLs only, so there is no upload attack surface.
* AI endpoints are authenticated but not rate-limited per user — watch provider spend.
