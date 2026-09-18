import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { apiGet, apiPatch, ApiError } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import { NoPermission, OfflineNotice, PageHeader, RoleBadge, Stat, ghostBtn } from "@/components/e3u/ui";
import { useAuth } from "@/lib/session";
import { SPECIALIZATION_KEYS, can } from "@/lib/permissions";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import type { AdminOverview, Role, Specialization, UserPublic } from "@/lib/types";

const ROLES: Role[] = ["R1", "R2", "R3", "R4", "R5"];
const SECTIONS = [
  { id: "members", to: "/members" },
  { id: "roles", to: "" },
  { id: "bank", to: "/bank" },
  { id: "trucks", to: "/trucks" },
  { id: "forum", to: "/forum" },
  { id: "recruit", to: "/recruitment" },
  { id: "reports", to: "/contact" },
  { id: "diplomacy", to: "/diplomacy" },
  { id: "audit", to: "/audit" },
] as const;

export default function Admin() {
  const { user, loading } = useAuth();
  const { t, tError } = useI18n();
  const qc = useQueryClient();
  const [section, setSection] = useState<string>("roles");

  const allowed = can(user, "admin.access");
  const overviewQ = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => apiGet<AdminOverview>("/admin/overview"),
    retry: false,
    enabled: allowed,
  });
  const membersQ = useQuery({
    queryKey: ["members", "", ""],
    queryFn: () => apiGet<UserPublic[]>("/members"),
    retry: false,
    enabled: allowed,
  });

  const err = (e: unknown) => toast.error(tError(e instanceof ApiError ? (e.body as { detail?: unknown })?.detail : null));
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["members"] });
    void qc.invalidateQueries({ queryKey: ["admin"] });
    void qc.invalidateQueries({ queryKey: ["auth"] });
  };

  const roleM = useMutation({
    mutationFn: (v: { id: string; role: Role; officer_roles: Specialization[] }) =>
      apiPatch<UserPublic>(`/members/${v.id}/role`, { role: v.role, title: "", officer_roles: v.officer_roles }),
    onSuccess: () => { toast.success(t("admin.roleSaved")); refresh(); },
    onError: err,
  });
  const statusM = useMutation({
    mutationFn: (v: { id: string; status: "active" | "pending" | "rejected" }) =>
      apiPatch<UserPublic>(`/members/${v.id}/status`, { status: v.status }),
    onSuccess: () => { toast.success(t("admin.statusSaved")); refresh(); },
    onError: err,
  });

  if (!loading && !allowed) {
    return (
      <AppShell>
        <PageHeader title={t("admin.title")} />
        <div className="glass rounded-2xl p-8 text-center text-white/60" data-testid="admin-denied">
          {t("admin.denied")}
        </div>
        <NoPermission />
      </AppShell>
    );
  }

  const o = overviewQ.data;
  const members = membersQ.data ?? [];

  function toggleSpec(m: UserPublic, spec: Specialization) {
    const next = m.officer_roles.includes(spec)
      ? m.officer_roles.filter((s) => s !== spec)
      : [...m.officer_roles, spec];
    roleM.mutate({ id: m.id, role: m.role, officer_roles: next });
  }

  return (
    <AppShell>
      <PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} />
      <OfflineNotice show={overviewQ.isError} />

      <div className="mb-6 flex flex-wrap gap-2" data-testid="admin-sections">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            data-testid={`admin-section-${s.id}`}
            className={`font-heading rounded-full px-4 py-2 text-[11px] font-semibold uppercase transition-colors duration-300 ${
              section === s.id ? "bg-[#D4AF37] text-[#050505]" : "border border-[#D4AF37]/30 text-[#F5D76E]"
            }`}
          >
            {t(`admin.section.${s.id}` as TranslationKey)}
          </button>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="admin-overview">
        <Stat label={t("admin.section.members")} value={o?.members ?? "—"} testid="admin-stat-members" />
        <Stat label={t("admin.pendingMembers")} value={o?.pending_members ?? "—"} testid="admin-stat-pending" />
        <Stat label={t("officer.pendingApprovals")} value={o?.pending_donations ?? "—"} testid="admin-stat-donations" />
        <Stat label={t("recruit.queue")} value={o?.pending_applications ?? "—"} testid="admin-stat-applications" />
        <Stat label={t("trucks.upcoming")} value={o?.open_trucks ?? "—"} testid="admin-stat-trucks" />
        <Stat label={t("forum.title")} value={o?.threads ?? "—"} testid="admin-stat-threads" />
        <Stat label={t("contact.inbox")} value={o?.open_reports ?? "—"} testid="admin-stat-reports" />
        <Stat label={t("admin.auditEntries")} value={o?.audit_entries ?? "—"} testid="admin-stat-audit" />
      </div>

      {section === "roles" || section === "members" ? (
        <div className="glass rounded-2xl p-6" data-testid="admin-members-table">
          <h3 className="font-heading mb-4 text-lg font-semibold text-[#F5D76E]">{t("admin.roster")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] tracking-[0.2em] text-white/35 uppercase">
                <tr>
                  <th className="py-2 pr-4">{t("members.title")}</th>
                  <th className="py-2 pr-4">{t("admin.setRole")}</th>
                  <th className="py-2 pr-4">{t("admin.officerRoles")}</th>
                  <th className="py-2">{t("bank.status")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-t border-white/5" data-testid={`admin-member-row-${m.nickname}`}>
                    <td className="py-3 pr-4">
                      <span className="text-white/80">{m.nickname}</span>
                      <div className="mt-1">
                        <RoleBadge role={m.role} />
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={m.role}
                        onChange={(e) => roleM.mutate({ id: m.id, role: e.target.value as Role, officer_roles: m.officer_roles })}
                        data-testid={`admin-role-select-${m.nickname}`}
                        className="rounded-lg border border-[#D4AF37]/25 bg-[#0D0D0D] px-2 py-1 text-xs text-white"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{t(`role.${r}`)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1.5">
                        {SPECIALIZATION_KEYS.map((spec) => {
                          const on = m.officer_roles.includes(spec);
                          const eligible = m.role === "R4" || m.role === "R5";
                          return (
                            <button
                              key={spec}
                              type="button"
                              disabled={!eligible}
                              onClick={() => toggleSpec(m, spec)}
                              data-testid={`admin-spec-${m.nickname}-${spec}`}
                              className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors duration-300 disabled:opacity-30 ${
                                on ? "border-[#D4AF37] bg-[#D4AF37]/20 text-[#F5D76E]" : "border-white/15 text-white/45"
                              }`}
                            >
                              {t(`officer.${spec}`)}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => statusM.mutate({ id: m.id, status: m.status === "active" ? "pending" : "active" })}
                        data-testid={`admin-status-${m.nickname}`}
                        className={ghostBtn}
                      >
                        {m.status === "active" ? t("contact.open") : t("members.pending")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-8" data-testid={`admin-panel-${section}`}>
          <h3 className="font-heading text-lg font-semibold text-[#F5D76E]">
            {t(`admin.section.${section}` as TranslationKey)}
          </h3>
          <p className="mt-2 text-sm text-white/50">{t("admin.subtitle")}</p>
          {SECTIONS.find((s) => s.id === section)?.to ? (
            <Link to={SECTIONS.find((s) => s.id === section)!.to} data-testid={`admin-open-${section}`} className={`${ghostBtn} mt-5 inline-flex`}>
              {t("officer.openModule")}
            </Link>
          ) : null}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r} className="rounded-xl bg-[#0D0D0D] px-4 py-3 text-sm">
                <RoleBadge role={r} />
                <p className="mt-2 text-white/45">{o?.role_counts?.[r] ?? 0}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
