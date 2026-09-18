"""AI helpers: clan assistant (streaming) + translator.

Portable by design — two providers, chosen from the environment:
  1. EMERGENT_LLM_KEY  → emergentintegrations (default on the Emergent platform)
  2. OPENAI_API_KEY    → direct OpenAI REST calls via httpx (self-hosted / exported)
Nothing else in the app depends on the Emergent platform, so an exported copy runs
with only OPENAI_API_KEY set.
"""

import hashlib
import json
import logging
import os
from datetime import datetime, timezone

import httpx
from dotenv import load_dotenv

from lib.db import db

load_dotenv()
logger = logging.getLogger(__name__)

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_BASE = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
MODEL_PROVIDER = "openai"
MODEL_NAME = os.environ.get("LLM_MODEL", "gpt-5.4")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

LANG_NAMES = {"ru": "Russian", "en": "English", "es": "Spanish", "tr": "Turkish"}

ASSISTANT_SYSTEM = (
    "You are the E3U HQ clan assistant for the mobile strategy game The Grand Mafia. "
    "You answer questions about squad formations (4/2/4, 4/3/3, 3/3/3), troop counters, "
    "heroes, weapons, gems, investments, city rules, clan rules, trucks and events. "
    "Be concrete and concise: at most 180 words, use short bullet lists. "
    "If a question is outside the game or clan operations, say so briefly. "
    "Always answer in {language}."
)

TRANSLATOR_SYSTEM = (
    "You are a translation engine. Translate the user's text into {language}. "
    "Output ONLY the translation as plain text: no quotes, no notes, no explanation, "
    "no language label. Preserve line breaks, names and numbers. "
    "If the text is already in {language}, repeat it unchanged."
)


def provider() -> str:
    if EMERGENT_KEY:
        return "emergent"
    if OPENAI_KEY:
        return "openai"
    return "none"


# ---------------------------------------------------------------- emergent provider
def _emergent_chat(session_id: str, system_message: str):
    from emergentintegrations.llm.chat import LlmChat  # imported lazily: optional dep

    return LlmChat(
        api_key=EMERGENT_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)


async def _emergent_stream(session_id: str, system: str, text: str):
    from emergentintegrations.llm.chat import StreamDone, TextDelta, UserMessage

    chat = _emergent_chat(session_id, system)
    async for event in chat.stream_message(UserMessage(text=text)):
        if isinstance(event, TextDelta):
            yield event.content
        elif isinstance(event, StreamDone):
            break


# ------------------------------------------------------------------ openai provider
async def _openai_stream(system: str, text: str):
    payload = {
        "model": OPENAI_MODEL,
        "stream": True,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": text},
        ],
    }
    headers = {"Authorization": f"Bearer {OPENAI_KEY}"}
    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST", f"{OPENAI_BASE}/chat/completions", json=payload, headers=headers
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if not data or data == "[DONE]":
                    continue
                try:
                    delta = json.loads(data)["choices"][0]["delta"].get("content")
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue
                if delta:
                    yield delta


async def _stream(session_id: str, system: str, text: str):
    p = provider()
    if p == "emergent":
        async for chunk in _emergent_stream(session_id, system, text):
            yield chunk
    elif p == "openai":
        async for chunk in _openai_stream(system, text):
            yield chunk
    else:
        raise RuntimeError("No LLM key configured (EMERGENT_LLM_KEY or OPENAI_API_KEY)")


# ------------------------------------------------------------------------- assistant
async def stream_assistant(session_id: str, question: str, lang: str, history: list[dict]):
    """Yields plain text chunks for an SSE response."""
    language = LANG_NAMES.get(lang, "Russian")
    system = ASSISTANT_SYSTEM.format(language=language)
    if history:
        recent = "\n".join(f"{m['role']}: {m['content']}" for m in history[-6:])
        system += f"\n\nRecent conversation for context:\n{recent}"
    async for chunk in _stream(session_id, system, question):
        yield chunk


# ------------------------------------------------------------------------ translator
def _cache_key(text: str, target_lang: str) -> str:
    return hashlib.sha256(f"{target_lang}::{text}".encode()).hexdigest()


async def translate_text(text: str, target_lang: str) -> str:
    """Returns the translation only. Results are cached in Mongo (`translations`) so
    auto-translating a busy forum costs one model call per unique message+language."""
    text = text.strip()
    if not text:
        return ""
    key = _cache_key(text, target_lang)
    hit = await db.translations.find_one({"_id": key}, {"_id": 0, "translated": 1})
    if hit:
        return hit["translated"]

    language = LANG_NAMES.get(target_lang, "English")
    system = TRANSLATOR_SYSTEM.format(language=language)
    out: list[str] = []
    async for chunk in _stream(f"translate-{target_lang}", system, text):
        out.append(chunk)
    translated = "".join(out).strip() or text

    await db.translations.update_one(
        {"_id": key},
        {
            "$set": {
                "target_lang": target_lang,
                "translated": translated,
                "created_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )
    return translated


async def translate_many(texts: list[str], target_lang: str) -> list[str]:
    """Sequential but cache-backed: used by the auto-translate batch endpoint."""
    results: list[str] = []
    for t in texts:
        try:
            results.append(await translate_text(t, target_lang))
        except Exception as exc:  # noqa: BLE001
            logger.warning("translate failed: %s", exc)
            results.append(t)
    return results
