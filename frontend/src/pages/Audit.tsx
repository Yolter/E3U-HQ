import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import { EmptyState, NoPermission, PageHeader, inputCls } from "@/components/e3u/ui";
import { useAuth } from "@/lib/session";
import { can } from "@/lib/permissions";
import { useI18n } from "@/lib/i18n";
import type { AuditEntry } from "@/lib/types";

const MODULES = ["members", "bank", "trucks", "forum", "events", "recruitment", "reports", "diplomacy", "auth", "profile"];

export default function Audit() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [module, setModule] = useState("");
  const [q, setQ] = useState("");

  const allowed = can(user, "audit.view");
  const { data } = useQuery({
    queryKey: ["audit", module, q],
    queryFn: () => apiGet<AuditEntry[]>(`/audit?module=${module}&q=${encodeURIComponent(q)}`),
    retry: false,
    enabled: allowed,
  });

  if (!loading && !allowed) {
    return (
      <AppShell>
        <PageHeader title={t("audit.title")} subtitle={t("audit.subtitle")} />
        <NoPermission />
      </AppShell>
    );
  }

  const rows = data ?? [];

  return (
    <AppShell>
      <PageHeader title={t("audit.title")} subtitle={t("audit.subtitle")} />

      <div className="mb-6 flex flex-wrap gap-3" data-testid="audit-filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.search")} data-testid="audit-search-input" className={inputCls} />
        <select value={module} onChange={(e) => setModule(e.target.value)} data-testid="audit-module-filter" className={inputCls}>
          <option value="">{t("common.all")}</option>
          {MODULES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="glass overflow-x-auto rounded-2xl p-6" data-testid="audit-table">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] tracking-[0.2em] text-white/35 uppercase">
              <tr>
                <th className="py-2 pr-4">{t("audit.when")}</th>
                <th className="py-2 pr-4">{t("audit.actor")}</th>
                <th className="py-2 pr-4">{t("audit.action")}</th>
                <th className="py-2 pr-4">{t("audit.module")}</th>
                <th className="py-2 pr-4">{t("audit.target")}</th>
                <th className="py-2">{t("audit.details")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t border-white/5" data-testid={`audit-row-${e.id}`}>
                  <td className="py-2.5 pr-4 text-white/45">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="py-2.5 pr-4 text-white/80">
                    {e.actor_nickname} <span className="text-white/35">{e.actor_role}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-[#F5D76E]">{e.action}</td>
                  <td className="py-2.5 pr-4 text-white/50">{e.module}</td>
                  <td className="py-2.5 pr-4 text-white/50">{e.target}</td>
                  <td className="py-2.5 text-white/35">{e.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
