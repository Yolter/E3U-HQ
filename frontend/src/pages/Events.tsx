import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost, ApiError } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import { EmptyState, OfflineNotice, PageHeader, ghostBtn, goldBtn, inputCls } from "@/components/e3u/ui";
import { useAuth } from "@/lib/session";
import { can } from "@/lib/permissions";
import { useI18n } from "@/lib/i18n";
import type { ClanEvent, EventKind } from "@/lib/types";

const KINDS: EventKind[] = ["governor_battle", "family_event", "custom"];

function useCountdown(iso: string) {
  const [left, setLeft] = useState(() => new Date(iso).getTime() - Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setLeft(new Date(iso).getTime() - Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [iso]);
  return left;
}

function EventCard({
  ev,
  joined,
  onJoin,
  onRemind,
  onDelete,
  canManage,
  canRemind,
}: {
  ev: ClanEvent;
  joined: boolean;
  onJoin: () => void;
  onRemind: () => void;
  onDelete: () => void;
  canManage: boolean;
  canRemind: boolean;
}) {
  const { t } = useI18n();
  const left = useCountdown(ev.starts_at);
  const label =
    left <= 0
      ? t("events.live")
      : `${Math.floor(left / 86400000)}d ${Math.floor((left % 86400000) / 3600000)}h ${Math.floor((left % 3600000) / 60000)}m ${Math.floor((left % 60000) / 1000)}s`;
  const alert = ev.kind === "governor_battle";

  return (
    <div
      className={`glass rounded-2xl p-6 ${alert ? "border-[#C2413B]/50 shadow-[0_0_40px_-22px_rgba(194,65,59,0.9)]" : ""}`}
      data-testid={`event-card-${ev.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-lg font-semibold text-white">{ev.title}</h3>
        <span
          className={`font-heading rounded-full border px-3 py-1 text-[10px] uppercase ${
            alert ? "border-[#C2413B]/60 text-[#E8837C]" : "border-[#D4AF37]/30 text-[#F5D76E]"
          }`}
        >
          {t(`events.kind.${ev.kind}`)}
        </span>
      </div>
      <p className="mt-2 text-sm text-white/45">{ev.description}</p>
      <p className="gold-text font-heading mt-4 text-xl font-bold" data-testid={`event-countdown-${ev.id}`}>
        {label}
      </p>
      <p className="mt-1 text-xs text-white/35">{new Date(ev.starts_at).toLocaleString()}</p>
      <p className="mt-3 text-xs text-white/40">
        {ev.participants.length} {t("events.joined")}
        {ev.participant_names.length ? ` — ${ev.participant_names.join(", ")}` : ""}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={onJoin} data-testid={`event-join-${ev.id}`} className={ghostBtn}>
          {joined ? t("events.leave") : t("events.join")}
        </button>
        {canRemind ? (
          <button type="button" onClick={onRemind} data-testid={`event-remind-${ev.id}`} className={ghostBtn}>
            {t("events.remind")}
          </button>
        ) : null}
        {canManage ? (
          <button type="button" onClick={onDelete} data-testid={`event-delete-${ev.id}`} className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-white/40">
            {t("common.delete")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function Events() {
  const { user } = useAuth();
  const { t, tError } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "", starts_at: "", kind: "custom" as EventKind });

  const eventsQ = useQuery({ queryKey: ["events"], queryFn: () => apiGet<ClanEvent[]>("/events"), retry: false });
  const err = (e: unknown) => toast.error(tError(e instanceof ApiError ? (e.body as { detail?: unknown })?.detail : null));
  const refresh = () => void qc.invalidateQueries({ queryKey: ["events"] });

  const joinM = useMutation({ mutationFn: (id: string) => apiPost<ClanEvent>(`/events/${id}/join`), onSuccess: refresh, onError: err });
  const remindM = useMutation({
    mutationFn: (id: string) => apiPost<{ sent: number }>(`/events/${id}/remind`),
    onSuccess: () => toast.success(t("events.reminded")),
    onError: err,
  });
  const deleteM = useMutation({ mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/events/${id}`), onSuccess: refresh, onError: err });
  const createM = useMutation({
    mutationFn: () =>
      apiPost<ClanEvent>("/events", { ...form, starts_at: new Date(form.starts_at).toISOString() }),
    onSuccess: () => {
      setForm({ title: "", description: "", starts_at: "", kind: "custom" });
      refresh();
    },
    onError: err,
  });

  const events = eventsQ.data ?? [];
  const canManage = can(user, "events.manage");

  return (
    <AppShell>
      <PageHeader title={t("events.title")} subtitle={t("events.subtitle")} />
      <OfflineNotice show={eventsQ.isError} />

      {canManage ? (
        <form
          data-testid="event-create-form"
          className="glass mb-6 flex flex-wrap items-end gap-3 rounded-2xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            createM.mutate();
          }}
        >
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("events.title")} data-testid="event-title-input" className={inputCls} />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as EventKind })} data-testid="event-kind-select" className={inputCls}>
            {KINDS.map((k) => (
              <option key={k} value={k}>{t(`events.kind.${k}`)}</option>
            ))}
          </select>
          <input required type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} data-testid="event-datetime-input" className={inputCls} />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t("forum.body")} data-testid="event-description-input" className={`${inputCls} flex-1`} />
          <button type="submit" data-testid="event-create-button" className={goldBtn}>{t("events.create")}</button>
        </form>
      ) : null}

      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="events-grid">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              ev={ev}
              joined={!!user && ev.participants.includes(user.id)}
              onJoin={() => joinM.mutate(ev.id)}
              onRemind={() => remindM.mutate(ev.id)}
              onDelete={() => deleteM.mutate(ev.id)}
              canManage={canManage}
              canRemind={can(user, "events.remind")}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
