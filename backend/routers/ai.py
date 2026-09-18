"""AI assistant (streaming SSE) + one-click translator."""

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from lib.ai import provider, stream_assistant, translate_many, translate_text
from lib.auth import current_user, require
from lib.db import db
from models.schemas import (
    AssistantMessage,
    AssistantRequest,
    TranslateBatchRequest,
    TranslateBatchResponse,
    TranslateRequest,
    TranslateResponse,
)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/status")
async def status():
    """Which LLM provider the deployment is wired to ("emergent", "openai", "none")."""
    return {"provider": provider()}


@router.post("/translate-batch", response_model=TranslateBatchResponse)
async def translate_batch(
    payload: TranslateBatchRequest, _: dict = Depends(require("ai.use"))
):
    """Auto-translate a whole page of messages in one round trip (cache-backed)."""
    return TranslateBatchResponse(
        translated=await translate_many(payload.texts, payload.target_lang),
        target_lang=payload.target_lang,
    )


@router.post("/translate", response_model=TranslateResponse)
async def translate(payload: TranslateRequest, _: dict = Depends(require("ai.use"))):
    translated = await translate_text(payload.text, payload.target_lang)
    return TranslateResponse(
        original=payload.text, translated=translated, target_lang=payload.target_lang
    )


@router.get("/history", response_model=list[AssistantMessage])
async def history(user: dict = Depends(current_user)):
    docs = (
        await db.ai_messages.find({"user_id": user["id"]}, {"_id": 0})
        .sort("created_at", 1)
        .to_list(100)
    )
    return [AssistantMessage(**d) for d in docs]


@router.delete("/history")
async def clear_history(user: dict = Depends(current_user)):
    await db.ai_messages.delete_many({"user_id": user["id"]})
    return {"ok": True}


@router.post("/chat")
async def chat(payload: AssistantRequest, user: dict = Depends(require("ai.use"))):
    """SSE stream of the assistant answer; both sides are persisted."""
    prior = (
        await db.ai_messages.find({"user_id": user["id"]}, {"_id": 0})
        .sort("created_at", 1)
        .to_list(100)
    )
    history_pairs = [{"role": m["role"], "content": m["content"]} for m in prior]

    question = AssistantMessage(user_id=user["id"], role="user", content=payload.question)
    await db.ai_messages.insert_one(question.model_dump())

    async def generator():
        chunks: list[str] = []
        try:
            async for chunk in stream_assistant(
                f"e3u-{user['id']}", payload.question, payload.lang, history_pairs
            ):
                chunks.append(chunk)
                yield f"data: {chunk}\n\n".replace("\n\n\n", "\n\n")
        except Exception as exc:  # noqa: BLE001
            yield f"data: [error] {exc}\n\n"
        answer = "".join(chunks)
        if answer:
            await db.ai_messages.insert_one(
                AssistantMessage(user_id=user["id"], role="assistant", content=answer).model_dump()
            )
        yield "event: done\ndata: end\n\n"

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
