"""Emergent-managed transactional email (Resend). Bodies come from server-side
templates only — never from caller input."""

import ipaddress
import logging
import os
import re
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()
logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
RESEND_KEY = os.environ.get("RESEND_API_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "E3U HQ")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "E3U HQ <onboarding@resend.dev>")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")
APP_URL = os.environ.get("APP_URL", "https://clan-headquarters.preview.emergentagent.com")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = (
    "reply with your password",
    "reply with the code",
    "send your password",
    "cvv",
    "send us your password",
    "enter your password below",
    "confirm your card number",
    "your full card number",
    "seed phrase",
    "recovery phrase",
    "verify your card",
    "social security number",
    "confirm your bank details",
)
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> str | None:
    """Two providers, chosen from the environment: the Emergent-managed relay
    (EMERGENT_EMAIL_KEY) or, for an exported/self-hosted copy, Resend directly
    (RESEND_API_KEY + a verified EMAIL_FROM domain)."""
    _assert_safe_email(subject, html)
    if not EMAIL_KEY and not RESEND_KEY:
        logger.error("No email provider configured (EMERGENT_EMAIL_KEY or RESEND_API_KEY)")
        raise HTTPException(status_code=503, detail="error.email_failed")

    if EMAIL_KEY:
        url = f"{EMAIL_BASE_URL}/api/v1/email/send"
        headers = {"X-Email-Key": EMAIL_KEY}
        payload: dict = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
        if EMAIL_REPLY_TO:
            payload["contact_email"] = EMAIL_REPLY_TO
    else:
        url = "https://api.resend.com/emails"
        headers = {"Authorization": f"Bearer {RESEND_KEY}"}
        payload = {"from": EMAIL_FROM, "to": [to], "subject": subject, "html": html}
        if EMAIL_REPLY_TO:
            payload["reply_to"] = EMAIL_REPLY_TO

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, headers=headers, json=payload)
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        logger.error("Email send failed: %s %s", e.response.status_code, e.response.text)
        raise HTTPException(status_code=502, detail="error.email_failed")
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("Email send error: %s", e)
        raise HTTPException(status_code=500, detail="error.email_failed")


# ---------- server-side templates (callers pass IDs/tokens, never markup) ----------
_SHELL = (
    '<table role="presentation" width="100%" style="background:#050505;padding:24px">'
    '<tr><td align="center"><table role="presentation" width="560" '
    'style="background:#111111;border:1px solid #D4AF37;border-radius:14px;padding:28px;'
    'font-family:Arial,Helvetica,sans-serif;color:#F7F5EF">'
    '<tr><td><p style="color:#D4AF37;letter-spacing:4px;font-size:12px;margin:0 0 18px">E3U HQ</p>'
    "{body}"
    '<p style="font-size:11px;color:#888;margin-top:26px">Sent by {brand}. '
    "We never ask for your password in email.</p>"
    "</td></tr></table></td></tr></table>"
)


async def send_password_reset(*, to: str, nickname: str, token: str) -> str | None:
    link = f"{APP_URL}/reset-password?token={token}"
    body = (
        f'<h1 style="font-size:20px;margin:0 0 12px">Password reset</h1>'
        f'<p style="color:#cfcabd;font-size:14px">Hi {escape(nickname)}, use the button below to '
        f"choose a new password for your E3U HQ account. The link expires in 60 minutes.</p>"
        f'<p style="margin:22px 0"><a href="{escape(link)}" '
        f'style="background:#D4AF37;color:#050505;padding:12px 22px;border-radius:999px;'
        f'text-decoration:none;font-weight:bold">Choose a new password</a></p>'
        f'<p style="font-size:12px;color:#888">If you did not request this, ignore this email.</p>'
    )
    return await send_email(
        to=to,
        subject="E3U HQ — password reset",
        html=_SHELL.format(body=body, brand=escape(EMAIL_FROM_NAME)),
    )


async def send_event_reminder(*, to: str, nickname: str, title: str, when: str) -> str | None:
    body = (
        f'<h1 style="font-size:20px;margin:0 0 12px">Event reminder</h1>'
        f'<p style="color:#cfcabd;font-size:14px">Hi {escape(nickname)}, '
        f"<strong>{escape(title)}</strong> starts at {escape(when)} (UTC).</p>"
        f'<p style="margin:22px 0"><a href="{escape(APP_URL)}/events" '
        f'style="background:#D4AF37;color:#050505;padding:12px 22px;border-radius:999px;'
        f'text-decoration:none;font-weight:bold">Open the events centre</a></p>'
    )
    return await send_email(
        to=to,
        subject=f"E3U HQ — {title}",
        html=_SHELL.format(body=body, brand=escape(EMAIL_FROM_NAME)),
    )
