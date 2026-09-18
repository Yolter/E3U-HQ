import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { toast } from "sonner";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import { EmptyState, OfflineNotice, PageHeader, RoleBadge, ghostBtn, goldBtn, inputCls } from "@/components/e3u/ui";
import { useAuth } from "@/lib/session";
import { can } from "@/lib/permissions";
import { useI18n } from "@/lib/i18n";
import type { Penalty, PenaltyKind, Role, UserPublic } from "@/lib/types";

const ROLES: Role[] = ["R1", "R2", "R3", "R4", "R5"];
const KINDS: PenaltyKind[] = ["warning", "fine", "violation", "note"];

export default function Members() {
  const { t, tError } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [target, setTarget] = useState<UserPublic | null>(null);
  const [penalty, setPenalty] = useState({ kind: "warning" as PenaltyKind, reason: "" });

  const { data, isError } = useQuery({
    queryKey: ["members", q, role],
    queryFn: () => apiGet<UserPublic[]>(`/members?q=${encodeURIComponent(q)}&role=${role}`),
    retry: false,
  });
  const penaltiesQ = useQuery({
    queryKey: ["penalties", "all"],
    queryFn: () => apiGet<Penalty[]>("/members/penalties/all"),
    retry: false,
    enabled: can(user, "penalties.manage"),
  });

  const penaltyM = useMutation({
    mutationFn: () =>
      apiPost<Penalty>("/members/penalties", {
        member_id: target!.id,
        kind: penalty.kind,
        reason: penalty.reason,
      }),
    onSuccess: () => {
      toast.success(t("members.penaltyIssued"));
      setTarget(null);
      setPenalty({ kind: "warning", reason: "" });
      void qc.invalidateQueries({ queryKey: ["members"] });
      void qc.invalidateQueries({ queryKey: ["penalties"] });
    },
    onError: (e) => toast.error(tError(e instanceof ApiError ? (e.body as { detail?: unknown })?.detail : null)),
  });

  const members = data ?? [];

  return (
    <AppShell>
      <PageHeader title={t("members.title")} subtitle={t("members.subtitle")} />
      <OfflineNotice show={isError} />

      <div className="mb-6 flex flex-wrap gap-3" data-testid="members-filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} data-testid="members-search-input" className={inputCls} />
        <select value={role} onChange={(e) => setRole(e.target.value)} data-testid="members-role-filter" className={inputCls}>
          <option value="">{t("common.all")}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{t(`role.${r}`)}</option>
          ))}
        </select>
      </div>

      {members.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="members-grid">
          {members.map((m, i) => (
            <motion.article
              key={m.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.4 }}
              className="glass rounded-2xl p-5"
              data-testid={`member-card-${m.nickname}`}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="font-heading grid h-14 w-14 place-items-center rounded-xl border border-[#D4AF37]/45 bg-[#0D0D0D] text-lg font-bold text-[#F5D76E]">
                    {m.nickname.slice(0, 2).toUpperCase()}
                  </div>
                  <span
                    data-testid={`member-online-${m.nickname}`}
                    title={m.online ? t("members.online") : t("members.offline")}
                    className={`absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full border-2 border-[#111] ${
                      m.online ? "bg-[#57D98A] shadow-[0_0_10px_#57D98A]" : "bg-white/25"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading truncate text-base font-semibold text-white">{m.nickname}</h3>
                  <p className="truncate text-xs text-white/40">
                    {m.city}
                    {m.title ? ` · ${m.title}` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <RoleBadge role={m.role} />
                {m.officer_roles.map((s) => (
                  <span key={s} className="rounded-full border border-[#D4AF37]/30 px-2 py-0.5 text-[10px] text-[#F5D76E]">
                    {t(`officer.${s}`)}
                  </span>
                ))}
                {m.status === "pending" ? (
                  <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-white/50">{t("members.pending")}</span>
                ) : null}
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-[#0D0D0D] px-3 py-2">
                  <dt className="text-white/35">{t("dash.contribution")}</dt>
                  <dd className="text-[#F5D76E]">{m.contribution.toLocaleString()}</dd>
                </div>
                <div className="rounded-lg bg-[#0D0D0D] px-3 py-2">
                  <dt className="text-white/35">{t("dash.trucks")}</dt>
                  <dd className="text-[#F5D76E]">{m.truck_count}</dd>
                </div>
                <div className="rounded-lg bg-[#0D0D0D] px-3 py-2">
                  <dt className="text-white/35">{t("dash.activity")}</dt>
                  <dd className="text-[#F5D76E]">{m.activity}%</dd>
                </div>
                <div className="rounded-lg bg-[#0D0D0D] px-3 py-2">
                  <dt className="text-white/35">{t("dash.warnings")}</dt>
                  <dd className="text-[#F5D76E]">{m.warning_count}</dd>
                </div>
              </dl>

              {can(user, "penalties.manage") ? (
                <button type="button" onClick={() => setTarget(m)} data-testid={`member-penalty-${m.nickname}`} className={`${ghostBtn} mt-4`}>
                  {t("members.issuePenalty")}
                </button>
              ) : null}
            </motion.article>
          ))}
        </div>
      )}

      {target ? (
        <form
          data-testid="penalty-form"
          className="glass mt-6 space-y-3 rounded-2xl p-6"
          onSubmit={(e) => {
            e.preventDefault();
            penaltyM.mutate();
          }}
        >
          <h3 className="font-heading text-lg font-semibold text-[#F5D76E]">
            {t("members.issuePenalty")} — {target.nickname}
          </h3>
          <select value={penalty.kind} onChange={(e) => setPenalty({ ...penalty, kind: e.target.value as PenaltyKind })} data-testid="penalty-kind-select" className={`${inputCls} w-full`}>
            {KINDS.map((k) => (
              <option key={k} value={k}>{t(`penalty.${k}`)}</option>
            ))}
          </select>
          <textarea required rows={2} value={penalty.reason} onChange={(e) => setPenalty({ ...penalty, reason: e.target.value })} placeholder={t("members.reason")} data-testid="penalty-reason-input" className={`${inputCls} w-full`} />
          <div className="flex gap-2">
            <button type="submit" data-testid="penalty-submit-button" className={goldBtn}>{t("common.save")}</button>
            <button type="button" onClick={() => setTarget(null)} className={ghostBtn}>{t("common.cancel")}</button>
          </div>
        </form>
      ) : null}

      {can(user, "penalties.manage") && (penaltiesQ.data ?? []).length ? (
        <div className="glass mt-6 rounded-2xl p-6" data-testid="penalties-history">
          <h3 className="font-heading mb-4 text-lg font-semibold text-[#F5D76E]">{t("members.warnings")}</h3>
          <ul className="space-y-2 text-sm">
            {(penaltiesQ.data ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-[#0D0D0D] px-4 py-2">
                <span className="text-white/75">{p.member_nickname}</span>
                <span className="text-[#F5D76E]">{t(`penalty.${p.kind}`)}</span>
                <span className="text-white/50">{p.reason}</span>
                <span className="text-xs text-white/30">{new Date(p.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </AppShell>
  );
}
