import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import { EmptyState, PageHeader, ghostBtn, goldBtn, inputCls } from "@/components/e3u/ui";
import { useAuth } from "@/lib/session";
import { can } from "@/lib/permissions";
import { useI18n, LANGS } from "@/lib/i18n";
import type { Application, Lang, UserPublic } from "@/lib/types";

export default function Recruitment() {
  const { user } = useAuth();
  const { t, tError, lang } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nickname: "",
    game_id: "",
    city: "",
    troop_type: "",
    power: 0,
    language: lang as Lang,
    telegram: "",
    whatsapp: "",
    screenshot_url: "",
  });
  const [notes, setNotes] = useState<Record<string, string>>({});

  const canReview = can(user, "recruit.review");
  const canApprove = can(user, "recruit.approve");

  const appsQ = useQuery({
    queryKey: ["applications"],
    queryFn: () => apiGet<Application[]>("/applications"),
    retry: false,
    enabled: canReview,
  });
  const pendingQ = useQuery({
    queryKey: ["applications", "pending-members"],
    queryFn: () => apiGet<UserPublic[]>("/applications/queue/pending"),
    retry: false,
    enabled: canReview,
  });

  const err = (e: unknown) => toast.error(tError(e instanceof ApiError ? (e.body as { detail?: unknown })?.detail : null));

  const submitM = useMutation({
    mutationFn: () => apiPost<Application>("/applications", { ...form, power: Number(form.power) }),
    onSuccess: () => {
      toast.success(t("recruit.submitted"));
      setForm({ ...form, nickname: "", game_id: "", city: "", troop_type: "", power: 0, telegram: "", whatsapp: "", screenshot_url: "" });
      void qc.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: err,
  });

  const reviewM = useMutation({
    mutationFn: (v: { id: string; status: "reviewed" | "approved" | "rejected" }) =>
      apiPatch<Application>(`/applications/${v.id}`, { status: v.status, interview_notes: notes[v.id] ?? "" }),
    onSuccess: () => {
      toast.success(t("recruit.reviewed"));
      void qc.invalidateQueries({ queryKey: ["applications"] });
      void qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: err,
  });

  const activateM = useMutation({
    mutationFn: (id: string) => apiPatch<UserPublic>(`/members/${id}/status`, { status: "active" }),
    onSuccess: () => {
      toast.success(t("admin.statusSaved"));
      void qc.invalidateQueries({ queryKey: ["applications"] });
      void qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: err,
  });

  return (
    <AppShell>
      <PageHeader title={t("recruit.title")} subtitle={t("recruit.subtitle")} />

      <form
        data-testid="application-form"
        className="glass grid gap-3 rounded-2xl p-6 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitM.mutate();
        }}
      >
        <h3 className="font-heading text-lg font-semibold text-[#F5D76E] sm:col-span-2">{t("recruit.apply")}</h3>
        <input required value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} placeholder={t("auth.nickname")} data-testid="application-nickname-input" className={inputCls} />
        <input required value={form.game_id} onChange={(e) => setForm({ ...form, game_id: e.target.value })} placeholder={t("recruit.gameId")} data-testid="application-gameid-input" className={inputCls} />
        <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t("auth.city")} data-testid="application-city-input" className={inputCls} />
        <input required value={form.troop_type} onChange={(e) => setForm({ ...form, troop_type: e.target.value })} placeholder={t("recruit.troop")} data-testid="application-troop-input" className={inputCls} />
        <input type="number" min={0} value={form.power} onChange={(e) => setForm({ ...form, power: Number(e.target.value) })} placeholder={t("recruit.power")} data-testid="application-power-input" className={inputCls} />
        <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as Lang })} data-testid="application-language-select" className={inputCls}>
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        <input value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} placeholder={t("settings.telegram")} data-testid="application-telegram-input" className={inputCls} />
        <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder={t("settings.whatsapp")} data-testid="application-whatsapp-input" className={inputCls} />
        <input value={form.screenshot_url} onChange={(e) => setForm({ ...form, screenshot_url: e.target.value })} placeholder={t("recruit.screenshot")} data-testid="application-screenshot-input" className={`${inputCls} sm:col-span-2`} />
        <button type="submit" disabled={submitM.isPending} data-testid="application-submit-button" className={`${goldBtn} sm:col-span-2`}>
          {t("recruit.submit")}
        </button>
      </form>

      {canReview ? (
        <>
          <h2 className="font-heading mt-10 mb-4 text-xl font-semibold text-[#F5D76E]">{t("recruit.queue")}</h2>
          {(appsQ.data ?? []).length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3" data-testid="application-queue">
              {(appsQ.data ?? []).map((a) => (
                <div key={a.id} className="glass rounded-2xl p-5" data-testid={`application-${a.nickname}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-heading text-base font-semibold text-white">{a.nickname}</h3>
                    <span className="rounded-full border border-[#D4AF37]/30 px-2 py-0.5 text-[10px] text-[#F5D76E] uppercase">
                      {t(`recruit.status.${a.status}`)}
                    </span>
                    <span className="text-xs text-white/40">
                      {a.city} · {a.troop_type} · {a.power.toLocaleString()} · {a.game_id}
                    </span>
                  </div>
                  {a.telegram || a.whatsapp ? (
                    <p className="mt-1 text-xs text-white/35">{[a.telegram, a.whatsapp].filter(Boolean).join(" · ")}</p>
                  ) : null}
                  <textarea
                    rows={2}
                    value={notes[a.id] ?? a.interview_notes}
                    onChange={(e) => setNotes({ ...notes, [a.id]: e.target.value })}
                    placeholder={t("recruit.interviewNotes")}
                    data-testid={`application-notes-${a.nickname}`}
                    className={`${inputCls} mt-3 w-full`}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => reviewM.mutate({ id: a.id, status: "reviewed" })} data-testid={`application-review-${a.nickname}`} className={ghostBtn}>
                      {t("recruit.markReviewed")}
                    </button>
                    {canApprove ? (
                      <button type="button" onClick={() => reviewM.mutate({ id: a.id, status: "approved" })} data-testid={`application-approve-${a.nickname}`} className="rounded-full bg-[#D4AF37] px-4 py-1.5 text-xs font-bold text-[#050505]">
                        {t("recruit.approve")}
                      </button>
                    ) : null}
                    <button type="button" onClick={() => reviewM.mutate({ id: a.id, status: "rejected" })} data-testid={`application-reject-${a.nickname}`} className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/50">
                      {t("recruit.reject")}
                    </button>
                  </div>
                  {a.history.length ? (
                    <details className="mt-3 text-xs text-white/40">
                      <summary className="cursor-pointer">{t("recruit.history")}</summary>
                      <ul className="mt-2 space-y-1">
                        {a.history.map((h, i) => (
                          <li key={i}>
                            {new Date(h.at).toLocaleString()} — {h.by} ({h.role}) → {h.status} {h.notes}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          <h2 className="font-heading mt-10 mb-4 text-xl font-semibold text-[#F5D76E]">{t("recruit.attestation")}</h2>
          {(pendingQ.data ?? []).length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-2" data-testid="attestation-queue">
              {(pendingQ.data ?? []).map((m) => (
                <li key={m.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-xl p-4 text-sm">
                  <span className="text-white/75">{m.nickname}</span>
                  <span className="text-xs text-white/40">{m.city} · {m.email}</span>
                  {can(user, "members.manage") ? (
                    <button type="button" onClick={() => activateM.mutate(m.id)} data-testid={`attestation-activate-${m.nickname}`} className={ghostBtn}>
                      {t("recruit.activate")}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </AppShell>
  );
}
