import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import { EmptyState, OfflineNotice, PageHeader, RoleBadge, goldBtn, inputCls } from "@/components/e3u/ui";
import { useAuth } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import type { ForumCategory, ForumThread } from "@/lib/types";

export default function Forum() {
  const { user } = useAuth();
  const { t, tError } = useI18n();
  const qc = useQueryClient();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState({ title: "", body: "", image_url: "" });

  const catsQ = useQuery({ queryKey: ["forum", "categories"], queryFn: () => apiGet<ForumCategory[]>("/forum/categories"), retry: false });
  const threadsQ = useQuery({
    queryKey: ["forum", "threads", category, search],
    queryFn: () => apiGet<ForumThread[]>(`/forum/threads?category=${category}&q=${encodeURIComponent(search)}`),
    retry: false,
  });

  const createM = useMutation({
    mutationFn: () =>
      apiPost<ForumThread>("/forum/threads", {
        category: category || "general",
        title: draft.title,
        body: draft.body,
        image_url: draft.image_url,
      }),
    onSuccess: () => {
      toast.success(t("forum.posted"));
      setDraft({ title: "", body: "", image_url: "" });
      void qc.invalidateQueries({ queryKey: ["forum"] });
    },
    onError: (e) => toast.error(tError(e instanceof ApiError ? (e.body as { detail?: unknown })?.detail : null)),
  });

  const cats = catsQ.data ?? [];
  const threads = threadsQ.data ?? [];

  return (
    <AppShell>
      <PageHeader title={t("forum.title")} subtitle={t("forum.subtitle")} />
      <OfflineNotice show={catsQ.isError || threadsQ.isError} />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="glass h-fit rounded-2xl p-4" data-testid="forum-categories">
          <button
            type="button"
            onClick={() => setCategory("")}
            data-testid="forum-category-all"
            className={`mb-1 w-full rounded-xl px-3 py-2 text-left text-sm transition-colors duration-300 ${
              category === "" ? "bg-[#D4AF37]/15 text-[#F5D76E]" : "text-white/55 hover:text-[#F5D76E]"
            }`}
          >
            {t("common.all")}
          </button>
          {cats.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCategory(c.slug)}
              data-testid={`forum-category-${c.slug}`}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors duration-300 ${
                category === c.slug ? "bg-[#D4AF37]/15 text-[#F5D76E]" : "text-white/55 hover:text-[#F5D76E]"
              }`}
            >
              <span>{t(`forum.cat.${c.slug}` as TranslationKey)}</span>
              <span className="text-xs text-white/30">{c.thread_count}</span>
            </button>
          ))}
        </aside>

        <div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("forum.searchThreads")}
            data-testid="forum-search-input"
            className={`${inputCls} mb-4 w-full`}
          />

          {user ? (
            <form
              data-testid="forum-new-thread-form"
              className="glass mb-6 space-y-3 rounded-2xl p-5"
              onSubmit={(e) => {
                e.preventDefault();
                createM.mutate();
              }}
            >
              <h3 className="font-heading text-lg font-semibold text-[#F5D76E]">{t("forum.newThread")}</h3>
              <input required minLength={3} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={t("forum.threadTitle")} data-testid="thread-title-input" className={`${inputCls} w-full`} />
              <textarea required rows={3} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder={t("forum.body")} data-testid="thread-body-input" className={`${inputCls} w-full`} />
              <input value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} placeholder={t("forum.imageUrl")} data-testid="thread-image-input" className={`${inputCls} w-full`} />
              <button type="submit" data-testid="thread-submit-button" className={goldBtn}>{t("forum.post")}</button>
            </form>
          ) : null}

          {threads.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-3" data-testid="forum-threads">
              {threads.map((th) => (
                <li key={th.id}>
                  <Link to={`/forum/${th.id}`} data-testid={`thread-link-${th.id}`} className="glass block rounded-2xl p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      {th.pinned ? (
                        <span className="rounded-full bg-[#D4AF37] px-2 py-0.5 text-[10px] font-bold text-[#050505]">{t("forum.pinned")}</span>
                      ) : null}
                      <h3 className="font-heading text-base font-semibold text-white">{th.title}</h3>
                      <span className="rounded-full border border-[#D4AF37]/25 px-2 py-0.5 text-[10px] text-white/45 uppercase">
                        {t(`forum.cat.${th.category}` as TranslationKey)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-white/45">{th.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/35">
                      <span className="text-[#F5D76E]">{th.author_nickname}</span>
                      <RoleBadge role={th.author_role} />
                      <span>{new Date(th.created_at).toLocaleDateString()}</span>
                      <span>{th.reply_count} {t("forum.replies")}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
