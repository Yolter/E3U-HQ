from fastapi import APIRouter, Depends, HTTPException

from lib.audit import log_action
from lib.auth import current_user, require
from lib.db import db
from models.schemas import ForumPost, ForumThread, PostCreate, ThreadCreate

router = APIRouter(prefix="/forum", tags=["forum"])

CATEGORIES = [
    {"slug": "announcements", "name": "Announcements"},
    {"slug": "recruitment", "name": "Recruitment"},
    {"slug": "guides", "name": "Guides"},
    {"slug": "diplomacy", "name": "Diplomacy"},
    {"slug": "questions", "name": "Questions"},
    {"slug": "strategy", "name": "Strategy"},
    {"slug": "reports", "name": "Reports"},
    {"slug": "general", "name": "General Chat"},
]
SLUGS = {c["slug"] for c in CATEGORIES}


@router.get("/categories")
async def categories():
    return [
        {**c, "thread_count": await db.forum_threads.count_documents({"category": c["slug"]})}
        for c in CATEGORIES
    ]


@router.get("/threads", response_model=list[ForumThread])
async def list_threads(category: str = "", q: str = ""):
    query: dict = {}
    if category:
        query["category"] = category
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"body": {"$regex": q, "$options": "i"}},
        ]
    docs = (
        await db.forum_threads.find(query, {"_id": 0})
        .sort([("pinned", -1), ("created_at", -1)])
        .to_list(500)
    )
    return [ForumThread(**d) for d in docs]


@router.post("/threads", response_model=ForumThread)
async def create_thread(payload: ThreadCreate, user: dict = Depends(require("forum.post"))):
    if payload.category not in SLUGS:
        raise HTTPException(status_code=400, detail="error.unknown_category")
    thread = ForumThread(
        **payload.model_dump(),
        author_id=user["id"],
        author_nickname=user["nickname"],
        author_role=user.get("role", "R1"),
    )
    await db.forum_threads.insert_one(thread.model_dump())
    await log_action(user, "forum.thread_created", thread.title, payload.category, "forum")
    return thread


@router.get("/threads/{thread_id}", response_model=ForumThread)
async def get_thread(thread_id: str):
    doc = await db.forum_threads.find_one({"id": thread_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="error.thread_not_found")
    return ForumThread(**doc)


@router.patch("/threads/{thread_id}/pin", response_model=ForumThread)
async def pin_thread(thread_id: str, user: dict = Depends(require("forum.pin"))):
    doc = await db.forum_threads.find_one({"id": thread_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.thread_not_found")
    await db.forum_threads.update_one({"id": thread_id}, {"$set": {"pinned": not doc.get("pinned")}})
    await log_action(user, "forum.thread_pinned", doc["title"], "", "forum")
    updated = await db.forum_threads.find_one({"id": thread_id}, {"_id": 0})
    return ForumThread(**updated)


@router.patch("/threads/{thread_id}/lock", response_model=ForumThread)
async def lock_thread(thread_id: str, user: dict = Depends(require("forum.moderate"))):
    doc = await db.forum_threads.find_one({"id": thread_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.thread_not_found")
    await db.forum_threads.update_one({"id": thread_id}, {"$set": {"locked": not doc.get("locked")}})
    await log_action(user, "forum.thread_locked", doc["title"], "", "forum")
    updated = await db.forum_threads.find_one({"id": thread_id}, {"_id": 0})
    return ForumThread(**updated)


@router.delete("/threads/{thread_id}")
async def delete_thread(thread_id: str, user: dict = Depends(require("forum.moderate"))):
    doc = await db.forum_threads.find_one({"id": thread_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.thread_not_found")
    await db.forum_threads.delete_one({"id": thread_id})
    await db.forum_posts.delete_many({"thread_id": thread_id})
    await log_action(user, "forum.thread_deleted", doc["title"], "moderation", "forum")
    return {"ok": True}


@router.get("/threads/{thread_id}/posts", response_model=list[ForumPost])
async def list_posts(thread_id: str):
    docs = (
        await db.forum_posts.find({"thread_id": thread_id}, {"_id": 0})
        .sort("created_at", 1)
        .to_list(500)
    )
    return [ForumPost(**d) for d in docs]


@router.post("/threads/{thread_id}/posts", response_model=ForumPost)
async def create_post(thread_id: str, payload: PostCreate, user: dict = Depends(require("forum.post"))):
    thread = await db.forum_threads.find_one({"id": thread_id})
    if not thread:
        raise HTTPException(status_code=404, detail="error.thread_not_found")
    if thread.get("locked"):
        raise HTTPException(status_code=400, detail="error.thread_locked")
    post = ForumPost(
        thread_id=thread_id,
        body=payload.body,
        author_id=user["id"],
        author_nickname=user["nickname"],
        author_role=user.get("role", "R1"),
    )
    await db.forum_posts.insert_one(post.model_dump())
    await db.forum_threads.update_one({"id": thread_id}, {"$inc": {"reply_count": 1}})
    return post


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(require("forum.moderate"))):
    doc = await db.forum_posts.find_one({"id": post_id})
    if not doc:
        raise HTTPException(status_code=404, detail="error.post_not_found")
    await db.forum_posts.delete_one({"id": post_id})
    await db.forum_threads.update_one({"id": doc["thread_id"]}, {"$inc": {"reply_count": -1}})
    await log_action(user, "forum.post_deleted", post_id, "moderation", "forum")
    return {"ok": True}
