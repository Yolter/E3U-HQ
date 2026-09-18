import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost, ApiError } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import { EmptyState, NoPermission, PageHeader, ghostBtn, goldBtn, inputCls } from "@/components/e3u/ui";
import { useAuth } from "@/lib/session";
import { can } from "@/lib/permissions";
import { useI18n } from "@/lib/i18n";
import type { DiplomacyEntry, Relation } from "@/lib/types";

const RELATIONS: Relation[] = ["ally", "nap", "neutral", "enemy"];
const TONE: Record<Relation, string> = {
  ally: "border-[#57D98A]/40 text-[#8FE3AE]",
  nap: "border-[#D4AF37]/40 text-[#F5D76E]",
  neutral: "border-white/20 text-white/60",
  enemy: "border-[#C2413B]/50 text-[#E8837C]",
};

export default function Diplomacy() {
  const { user, loading } = useAuth();
  const { t, tError } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({ clan_name: "", relation: "neutral" as Relation, leader_contact: "", notes: "" });

  const allowed = can(user, "diplomacy.view");
  const entriesQ = useQuery({
    queryKey: ["diplomacy"],
    queryFn: () => apiGet<DiplomacyEntry[]>("/diplomacy"),
    retry: false,
    enabled: allowed,
  });

  const err = (e: unknown) => toast.error(tError(e instanceof ApiError ? (e.body as { detail?: unknown })?.detail : null));
  const refresh = () => void qc.invalidateQueries({ queryKey: ["diplomacy"] });

  const createM = useMutation({
    mutationFn: () => apiPost<DiplomacyEntry>("/diplomacy", form),
    onSuccess: () => {
      toast.success(t("diplo.saved"));
      setForm({ clan_name: "", relation: "neutral", leader_contact: "", notes: "" });
      refresh();
    },
    onError: err,
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/diplomacy/${id}`),
    onSuccess: () => { toast.success(t("diplo.deleted")); refresh(); },
    onError: err,
  });

  if (!loading && !allowed) {
    return (
      <AppShell>
        <PageHeader title={t("diplo.title")} subtitle={t("diplo.subtitle")} />
        <NoPermission />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title={t("diplo.title")} subtitle={t("diplo.subtitle")} />

      {can(user, "diplomacy.manage") ? (
        <form
          data-testid="diplomacy-form"
          className="glass mb-6 flex flex-wrap items-end gap-3 rounded-2xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            createM.mutate();
          }}
        >
          <input required value={form.clan_name} onChange={(e) => setForm({ ...form, clan_name: e.target.value })} placeholder={t("diplo.clan")} data-testid="diplomacy-clan-input" className={inputCls} />
          <select value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value as Relation })} data-testid="diplomacy-relation-select" className={inputCls}>
            {RELATIONS.map((r) => (
              <option key={r} value={r}>{t(`diplo.rel.${r}`)}</option>
            ))}
          </select>
          <input value={form.leader_contact} onChange={(e) => setForm({ ...form, leader_contact: e.target.value })} placeholder={t("diplo.contact")} data-testid="diplomacy-contact-input" className={inputCls} />
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("diplo.notes")} data-testid="diplomacy-notes-input" className={`${inputCls} flex-1`} />
          <button type="submit" data-testid="diplomacy-submit-button" className={goldBtn}>{t("diplo.add")}</button>
        </form>
      ) : null}

      {(entriesQ.data ?? []).length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2" data-testid="diplomacy-list">
          {(entriesQ.data ?? []).map((d) => (
            <div key={d.id} className="glass rounded-2xl p-5" data-testid={`diplomacy-entry-${d.clan_name}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-heading text-base font-semibold text-white">{d.clan_name}</h3>
                <span className={`font-heading rounded-full border px-3 py-1 text-[10px] uppercase ${TONE[d.relation]}`}>
                  {t(`diplo.rel.${d.relation}`)}
                </span>
              </div>
              {d.leader_contact ? <p className="mt-2 text-xs text-[#F5D76E]">{d.leader_contact}</p> : null}
              <p className="mt-2 text-sm text-white/50">{d.notes}</p>
              <p className="mt-3 text-[11px] text-white/30">{d.updated_by} · {new Date(d.updated_at).toLocaleDateString()}</p>
              {can(user, "diplomacy.manage") ? (
                <button type="button" onClick={() => deleteM.mutate(d.id)} data-testid={`diplomacy-delete-${d.clan_name}`} className={`${ghostBtn} mt-3`}>
                  {t("common.delete")}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
