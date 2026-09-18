import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import {
  EmptyState,
  OfflineNotice,
  PageHeader,
  RoleBadge,
  TranslatableText,
  ghostBtn,
  goldBtn,
  inputCls,
} from "@/components/e3u/ui";
import { useAuth } from "@/lib/session";
import { can } from "@/lib/permissions";
import { useI18n } from "@/lib/i18n";
import type { ForumPost, ForumThread } from "@/lib/types";

export default function ThreadView() {
  const { threadId = "" } = useParams();
  const { user } = useAuth();
  const { t, tError } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const threadQ = useQuery({ queryKey: ["forum", "thread", threadId], queryFn: () => apiGet<ForumThread>(`/forum/threads/${threadId}`), retry: false });
  const postsQ = useQuery({ queryKey: ["forum", "posts", threadId], queryFn: () => apiGet<ForumPost[]>(`/forum/threads/${threadId}/posts`), retry: false });

  const err = (e: unknown) => toast.error(tError(e instanceof ApiError ? (e.body as { detail?: unknown })?.detail : null));
  const refresh = () => void qc.invalidateQueries({ queryKey: ["forum"] });

  const replyM = useMutation({
    mutationFn: () => apiPost<ForumPost>(`/forum/threads/${threadId}/posts`, { body }),
    onSuccess: () => { setBody(""); toast.success(t("forum.replied")); refresh(); },
    onError: err,
  });
  const pinM = useMutation({ mutationFn: () => apiPatch<ForumThread>(`/forum/threads/${threadId}/pin`), onSuccess: refresh, onError: err });
  const lockM = useMutation({ mutationFn: () => apiPatch<ForumThread>(`/forum/threads/${threadId}/lock`), onSuccess: refresh, onError: err });
  const delThreadM = useMutation({
    mutationFn: () => apiDelete<{ ok: boolean }>(`/forum/threads/${threadId}`),
    onSuccess: () => { toast.success(t("forum.deleted")); refresh(); navigate("/forum"); },
    onError: err,
  });
  const delPostM = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/forum/posts/${id}`),
    onSuccess: () => { toast.success(t("forum.deleted")); refresh(); },
    onError: err,
  });

  const thread = threadQ.data;
  const posts = postsQ.data ?? [];

  return (
    <AppShell>
      <PageHeader
        title={thread?.title ?? t("forum.title")}
        subtitle={thread ? `${thread.author_nickname}` : undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <Link to="/forum" data-testid="thread-back-link" className={ghostBtn}>
              {t("forum.backToForum")}
            </Link>
            {can(user, "forum.pin") ? (
              <button type="button" onClick={() => pinM.mutate()} title={t("tip.pin")} data-testid="thread-pin-button" className={ghostBtn}>
                {thread?.pinned ? t("forum.unpin") : t("forum.pin")}
              </button>
            ) : null}
            {can(user, "forum.moderate") ? (
              <>
                <button type="button" onClick={() => lockM.mutate()} data-testid="thread-lock-button" className={ghostBtn}>
                  {thread?.locked ? t("forum.unlock") : t("forum.lock")}
                </button>
                <button type="button" onClick={() => delThreadM.mutate()} data-testid="thread-delete-button" className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/50">
                  {t("forum.delete")}
                </button>
              </>
            ) : null}
          </div>
        }
      />
      <OfflineNotice show={threadQ.isError} />

      {thread ? (
        <article className="glass rounded-2xl p-6" data-testid="thread-opening-post">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-white/40">
            <span className="text-[#F5D76E]">{thread.author_nickname}</span>
            <RoleBadge role={thread.author_role} />
            <span>{new Date(thread.created_at).toLocaleString()}</span>
            {thread.locked ? <span className="text-[#F5D76E]">{t("forum.locked")}</span> : null}
          </div>
          {thread.image_url ? (
            <img src={thread.image_url} alt="" className="mb-4 max-h-72 rounded-xl border border-[#D4AF37]/20 object-cover" data-testid="thread-image" />
          ) : null}
          <TranslatableText text={thread.body} testid="thread-body" />
        </article>
      ) : null}

      <div className="mt-6 space-y-3" data-testid="thread-replies">
        {posts.length === 0 ? (
          <EmptyState label={t("forum.noReplies")} />
        ) : (
          posts.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-5" data-testid={`thread-reply-${p.id}`}>
              <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-white/40">
                <span className="text-[#F5D76E]">{p.author_nickname}</span>
                <RoleBadge role={p.author_role} />
                <span>{new Date(p.created_at).toLocaleString()}</span>
                {can(user, "forum.moderate") ? (
                  <button type="button" onClick={() => delPostM.mutate(p.id)} data-testid={`reply-delete-${p.id}`} className="ml-auto text-[11px] text-white/35 hover:text-[#F5D76E]">
                    {t("forum.delete")}
                  </button>
                ) : null}
              </div>
              <TranslatableText text={p.body} testid={`reply-body-${p.id}`} />
            </div>
          ))
        )}
      </div>

      {user && !thread?.locked ? (
        <form
          data-testid="reply-form"
          className="glass mt-6 space-y-3 rounded-2xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            replyM.mutate();
          }}
        >
          <textarea required rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("forum.body")} data-testid="reply-body-input" className={`${inputCls} w-full`} />
          <button type="submit" data-testid="reply-submit-button" className={goldBtn}>{t("forum.reply")}</button>
        </form>
      ) : null}
    </AppShell>
  );
}
