import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import { EmptyState, OfflineNotice, PageHeader, Stat, ghostBtn, goldBtn, inputCls } from "@/components/e3u/ui";
import { useAuth } from "@/lib/session";
import { can } from "@/lib/permissions";
import { useI18n } from "@/lib/i18n";
import type { Truck, TruckStats, UserPublic } from "@/lib/types";

export default function Trucks() {
  const { user } = useAuth();
  const { t, tError } = useI18n();
  const qc = useQueryClient();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [form, setForm] = useState({ title: "", route: "", scheduled_for: "", capacity: 5 });

  const trucksQ = useQuery({ queryKey: ["trucks"], queryFn: () => apiGet<Truck[]>("/trucks"), retry: false });
  const statsQ = useQuery({ queryKey: ["trucks", "stats"], queryFn: () => apiGet<TruckStats>("/trucks/stats"), retry: false });
  const membersQ = useQuery({
    queryKey: ["members", "", "", "attendance"],
    queryFn: () => apiGet<UserPublic[]>("/members"),
    retry: false,
    enabled: can(user, "trucks.attendance"),
  });

  const err = (e: unknown) => toast.error(tError(e instanceof ApiError ? (e.body as { detail?: unknown })?.detail : null));
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["trucks"] });
    void qc.invalidateQueries({ queryKey: ["auth"] });
  };

  const joinM = useMutation({
    mutationFn: (id: string) => apiPost<Truck>(`/trucks/${id}/join`),
    onSuccess: () => { toast.success(t("trucks.joined")); refresh(); },
    onError: err,
  });
  const completeM = useMutation({
    mutationFn: (id: string) => apiPatch<Truck>(`/trucks/${id}/complete`),
    onSuccess: refresh,
    onError: err,
  });
  const deleteM = useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/trucks/${id}`),
    onSuccess: refresh,
    onError: err,
  });
  const attendM = useMutation({
    mutationFn: (v: { id: string; user_id: string; attended: boolean }) =>
      apiPatch<Truck>(`/trucks/${v.id}/attendance`, { user_id: v.user_id, attended: v.attended }),
    onSuccess: refresh,
    onError: err,
  });
  const createM = useMutation({
    mutationFn: () =>
      apiPost<Truck>("/trucks", {
        title: form.title,
        route: form.route,
        capacity: Number(form.capacity),
        scheduled_for: new Date(form.scheduled_for).toISOString(),
      }),
    onSuccess: () => {
      toast.success(t("trucks.created"));
      setForm({ title: "", route: "", scheduled_for: "", capacity: 5 });
      refresh();
    },
    onError: err,
  });

  const trucks = trucksQ.data ?? [];
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const startPad = (first.getDay() + 6) % 7;
  const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const nameOf = (id: string) => (membersQ.data ?? []).find((m) => m.id === id)?.nickname ?? id.slice(0, 6);

  return (
    <AppShell>
      <PageHeader
        title={t("trucks.title")}
        subtitle={t("trucks.subtitle")}
        action={
          <div className="flex gap-2" data-testid="trucks-view-toggle">
            {(["list", "calendar"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                data-testid={`trucks-view-${v}`}
                className={`font-heading rounded-full px-4 py-2 text-[11px] font-semibold uppercase transition-colors duration-300 ${
                  view === v ? "bg-[#D4AF37] text-[#050505]" : "border border-[#D4AF37]/35 text-[#F5D76E]"
                }`}
              >
                {t(`trucks.${v}`)}
              </button>
            ))}
          </div>
        }
      />
      <OfflineNotice show={trucksQ.isError} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="trucks-stats">
        <Stat label={t("trucks.total")} value={statsQ.data?.total ?? 0} testid="truck-stat-total" />
        <Stat label={t("trucks.completed")} value={statsQ.data?.completed ?? 0} testid="truck-stat-completed" />
        <Stat label={t("trucks.upcoming")} value={statsQ.data?.upcoming ?? 0} testid="truck-stat-upcoming" />
        <Stat label={t("trucks.attendanceRate")} value={`${statsQ.data?.attendance_rate ?? 0}%`} testid="truck-stat-rate" />
      </div>

      {can(user, "trucks.manage") ? (
        <form
          data-testid="truck-create-form"
          className="glass mb-6 flex flex-wrap items-end gap-3 rounded-2xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            createM.mutate();
          }}
        >
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("trucks.title_field")} data-testid="truck-title-input" className={inputCls} />
          <input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} placeholder={t("trucks.route")} data-testid="truck-route-input" className={inputCls} />
          <input required type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} data-testid="truck-datetime-input" className={inputCls} />
          <button type="submit" data-testid="truck-create-button" className={goldBtn}>
            {t("trucks.schedule")}
          </button>
        </form>
      ) : (
        <p className="mb-4 text-xs text-white/35" data-testid="trucks-readonly-note">{t("common.readOnly")}</p>
      )}

      {view === "calendar" ? (
        <div className="glass rounded-2xl p-6" data-testid="trucks-calendar">
          <h3 className="font-heading mb-4 text-lg font-semibold text-[#F5D76E]">
            {first.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </h3>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-white/35 uppercase">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: days }).map((_, i) => {
              const day = i + 1;
              const dayTrucks = trucks.filter((tr) => {
                const d = new Date(tr.scheduled_for);
                return d.getMonth() === today.getMonth() && d.getDate() === day;
              });
              return (
                <div
                  key={day}
                  data-testid={`calendar-day-${day}`}
                  className={`min-h-16 rounded-lg border p-1.5 text-left text-[11px] ${
                    dayTrucks.length ? "border-[#D4AF37]/50 bg-[#1A1710]" : "border-white/5 bg-[#0C0C0C] text-white/30"
                  }`}
                >
                  <span className="text-white/45">{day}</span>
                  {dayTrucks.map((tr) => (
                    <p key={tr.id} className="mt-1 truncate text-[#F5D76E]">{tr.title}</p>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : trucks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2" data-testid="trucks-list">
          {trucks.map((tr) => {
            const joined = !!user && tr.participants.includes(user.id);
            return (
              <div key={tr.id} className="glass rounded-2xl p-6" data-testid={`truck-card-${tr.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-white">{tr.title}</h3>
                    <p className="mt-1 text-xs text-white/45">{tr.route || t("trucks.routeTbd")}</p>
                  </div>
                  <span
                    className={`font-heading rounded-full px-3 py-1 text-[10px] font-semibold uppercase ${
                      tr.completed ? "bg-[#D4AF37]/20 text-[#F5D76E]" : "border border-white/15 text-white/50"
                    }`}
                  >
                    {tr.completed ? t("trucks.completed") : t("trucks.open")}
                  </span>
                </div>
                <p className="mt-3 text-sm text-[#F5D76E]">{new Date(tr.scheduled_for).toLocaleString()}</p>
                <p className="mt-3 text-xs text-white/45">
                  {t("trucks.participants")} {tr.participants.length}/{tr.capacity}
                  {tr.participant_names.length ? ` — ${tr.participant_names.join(", ")}` : ""}
                </p>

                {can(user, "trucks.attendance") && tr.participants.length ? (
                  <div className="mt-3 rounded-xl bg-[#0D0D0D] p-3" data-testid={`truck-attendance-${tr.id}`}>
                    <p className="mb-2 text-[10px] tracking-[0.2em] text-white/35 uppercase">{t("trucks.attendance")}</p>
                    {tr.participants.map((pid) => (
                      <label key={pid} className="flex items-center gap-2 py-0.5 text-xs text-white/60">
                        <input
                          type="checkbox"
                          checked={tr.attended.includes(pid)}
                          onChange={(e) => attendM.mutate({ id: tr.id, user_id: pid, attended: e.target.checked })}
                          data-testid={`attendance-${tr.id}-${pid}`}
                          className="h-3.5 w-3.5 accent-[#D4AF37]"
                        />
                        {nameOf(pid)}
                      </label>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={!user} onClick={() => joinM.mutate(tr.id)} data-testid={`truck-join-${tr.id}`} className={ghostBtn}>
                    {joined ? t("trucks.leave") : t("trucks.join")}
                  </button>
                  {can(user, "trucks.manage") ? (
                    <>
                      <button type="button" onClick={() => completeM.mutate(tr.id)} data-testid={`truck-complete-${tr.id}`} className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/60">
                        {t("trucks.toggleComplete")}
                      </button>
                      <button type="button" onClick={() => deleteM.mutate(tr.id)} data-testid={`truck-delete-${tr.id}`} className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/40">
                        {t("common.delete")}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
