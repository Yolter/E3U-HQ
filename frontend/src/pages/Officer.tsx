import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiGet } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import { NoPermission, PageHeader, Stat, ghostBtn } from "@/components/e3u/ui";
import { useAuth } from "@/lib/session";
import { SPECIALIZATION_KEYS, can, isOfficer } from "@/lib/permissions";
import { useI18n } from "@/lib/i18n";
import type { Application, Donation, Report, Specialization, Truck, TruckStats } from "@/lib/types";

/** One card per specialization — an officer only sees the modules they own. */
const MODULES: Record<Specialization, { to: string; permission: string }> = {
  bank_manager: { to: "/bank", permission: "bank.approve" },
  truck_manager: { to: "/trucks", permission: "trucks.manage" },
  recruit_officer: { to: "/recruitment", permission: "recruit.review" },
  diplomat: { to: "/diplomacy", permission: "diplomacy.manage" },
  forum_moderator: { to: "/forum", permission: "forum.moderate" },
  event_officer: { to: "/events", permission: "events.manage" },
};

export default function Officer() {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  const donationsQ = useQuery({
    queryKey: ["bank", "donations", "", "pending"],
    queryFn: () => apiGet<Donation[]>("/bank/donations?status=pending"),
    retry: false,
    enabled: can(user, "bank.approve"),
  });
  const trucksQ = useQuery({
    queryKey: ["trucks"],
    queryFn: () => apiGet<Truck[]>("/trucks"),
    retry: false,
    enabled: can(user, "trucks.manage"),
  });
  const truckStatsQ = useQuery({
    queryKey: ["trucks", "stats"],
    queryFn: () => apiGet<TruckStats>("/trucks/stats"),
    retry: false,
    enabled: can(user, "trucks.manage"),
  });
  const appsQ = useQuery({
    queryKey: ["applications"],
    queryFn: () => apiGet<Application[]>("/applications?status=pending"),
    retry: false,
    enabled: can(user, "recruit.review"),
  });
  const reportsQ = useQuery({
    queryKey: ["reports"],
    queryFn: () => apiGet<Report[]>("/reports?status=open"),
    retry: false,
    enabled: can(user, "reports.read"),
  });

  if (!loading && !isOfficer(user)) {
    return (
      <AppShell>
        <PageHeader title={t("officer.title")} subtitle={t("officer.subtitle")} />
        <NoPermission />
      </AppShell>
    );
  }

  // R5 sees every officer desk; an R4 sees only the specializations assigned to them.
  const mine = user?.role === "R5" ? SPECIALIZATION_KEYS : (user?.officer_roles ?? []);

  const metrics: Record<Specialization, { label: string; value: number | string }> = {
    bank_manager: { label: t("officer.pendingApprovals"), value: donationsQ.data?.length ?? 0 },
    truck_manager: { label: t("trucks.upcoming"), value: truckStatsQ.data?.upcoming ?? trucksQ.data?.length ?? 0 },
    recruit_officer: { label: t("recruit.queue"), value: appsQ.data?.length ?? 0 },
    diplomat: { label: t("diplo.title"), value: "—" },
    forum_moderator: { label: t("forum.title"), value: "—" },
    event_officer: { label: t("events.title"), value: "—" },
  };

  return (
    <AppShell>
      <PageHeader title={t("officer.title")} subtitle={t("officer.subtitle")} />

      {mine.length === 0 ? (
        <p className="glass rounded-2xl p-8 text-center text-white/60" data-testid="officer-none">
          {t("officer.none")}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="officer-dashboards">
          {mine.map((spec) => (
            <section key={spec} className="glass rounded-2xl p-6" data-testid={`officer-card-${spec}`}>
              <h2 className="font-heading text-lg font-semibold text-[#F5D76E]">{t(`officer.${spec}`)}</h2>
              <div className="mt-4">
                <Stat label={metrics[spec].label} value={metrics[spec].value} testid={`officer-metric-${spec}`} />
              </div>
              <Link to={MODULES[spec].to} data-testid={`officer-open-${spec}`} className={`${ghostBtn} mt-4 inline-flex`}>
                {t("officer.openModule")}
              </Link>
            </section>
          ))}
        </div>
      )}

      {can(user, "reports.read") ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3" data-testid="officer-open-tasks">
          <Stat label={t("officer.openTasks")} value={reportsQ.data?.length ?? 0} testid="officer-open-reports" />
        </div>
      ) : null}
    </AppShell>
  );
}
