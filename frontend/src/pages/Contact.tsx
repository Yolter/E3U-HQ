import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import { EmptyState, PageHeader, TranslatableText, ghostBtn, goldBtn, inputCls } from "@/components/e3u/ui";
import { useAuth } from "@/lib/session";
import { can } from "@/lib/permissions";
import { useI18n } from "@/lib/i18n";
import type { Report, ReportCategory } from "@/lib/types";

const CATEGORIES: ReportCategory[] = ["complaint", "suggestion", "conflict", "leadership", "trucks", "bank", "other"];

export default function Contact() {
  const { user } = useAuth();
  const { t, tError, lang } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({ category: "suggestion" as ReportCategory, body: "", anonymous: true });
  const [replies, setReplies] = useState<Record<string, string>>({});

  const canRead = can(user, "reports.read");
  const inboxQ = useQuery({
    queryKey: ["reports"],
    queryFn: () => apiGet<Report[]>("/reports"),
    retry: false,
    enabled: canRead,
  });

  const err = (e: unknown) => toast.error(tError(e instanceof ApiError ? (e.body as { detail?: unknown })?.detail : null));

  const sendM = useMutation({
    mutationFn: () => apiPost<Report>("/reports", { ...form, language: lang }),
    onSuccess: () => {
      toast.success(t("contact.sent"));
      setForm({ ...form, body: "" });
      void qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: err,
  });

  const replyM = useMutation({
    mutationFn: (id: string) => apiPatch<Report>(`/reports/${id}`, { reply: replies[id] ?? "", status: "closed" }),
    onSuccess: () => {
      toast.success(t("contact.answered"));
      void qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: err,
  });

  return (
    <AppShell>
      <PageHeader title={t("contact.title")} subtitle={t("contact.subtitle")} />

      <form
        data-testid="report-form"
        className="glass space-y-3 rounded-2xl p-6"
        onSubmit={(e) => {
          e.preventDefault();
          sendM.mutate();
        }}
      >
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value as ReportCategory })}
          data-testid="report-category-select"
          className={`${inputCls} w-full`}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{t(`contact.cat.${c}`)}</option>
          ))}
        </select>
        <textarea
          required
          rows={4}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder={t("contact.message")}
          data-testid="report-body-input"
          className={`${inputCls} w-full`}
        />
        <label className="flex items-center gap-2 text-xs text-white/55">
          <input
            type="checkbox"
            checked={form.anonymous}
            onChange={(e) => setForm({ ...form, anonymous: e.target.checked })}
            data-testid="report-anonymous-checkbox"
            className="h-4 w-4 accent-[#D4AF37]"
          />
          {form.anonymous ? t("contact.anonymous") : t("contact.named")}
        </label>
        <p className="text-[11px] text-white/35">{t("contact.anonymousHint")}</p>
        <button type="submit" disabled={sendM.isPending} data-testid="report-submit-button" className={goldBtn}>
          {t("contact.send")}
        </button>
      </form>

      {canRead ? (
        <>
          <h2 className="font-heading mt-10 mb-4 text-xl font-semibold text-[#F5D76E]">{t("contact.inbox")}</h2>
          {(inboxQ.data ?? []).length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3" data-testid="report-inbox">
              {(inboxQ.data ?? []).map((r) => (
                <div key={r.id} className="glass rounded-2xl p-5" data-testid={`report-${r.id}`}>
                  <div className="mb-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="rounded-full border border-[#D4AF37]/30 px-2 py-0.5 text-[10px] text-[#F5D76E] uppercase">
                      {t(`contact.cat.${r.category}`)}
                    </span>
                    <span className="text-white/40">
                      {r.anonymous ? t("contact.anonymous") : r.author_nickname}
                    </span>
                    <span className="text-white/30">{new Date(r.created_at).toLocaleString()}</span>
                    <span className="ml-auto text-white/40">{r.status === "open" ? t("contact.open") : t("contact.closed")}</span>
                  </div>
                  <TranslatableText text={r.body} testid={`report-body-${r.id}`} />
                  {r.reply ? <p className="mt-2 border-l-2 border-[#D4AF37]/40 pl-3 text-sm text-white/55">{r.reply}</p> : null}
                  {r.status === "open" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        value={replies[r.id] ?? ""}
                        onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })}
                        placeholder={t("contact.reply")}
                        data-testid={`report-reply-input-${r.id}`}
                        className={`${inputCls} flex-1`}
                      />
                      <button type="button" onClick={() => replyM.mutate(r.id)} data-testid={`report-reply-button-${r.id}`} className={ghostBtn}>
                        {t("contact.reply")}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </AppShell>
  );
}
