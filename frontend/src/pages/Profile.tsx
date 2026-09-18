import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet, apiPut, ApiError } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import {
  EmptyState,
  OfflineNotice,
  PageHeader,
  RoleBadge,
  SignInPrompt,
  Stat,
  goldBtn,
  inputCls,
} from "@/components/e3u/ui";
import { useAuth } from "@/lib/session";
import { can } from "@/lib/permissions";
import { useI18n, LANGS } from "@/lib/i18n";
import type { Donation, Lang, Penalty, UserPublic } from "@/lib/types";

export default function Profile() {
  const { user, loading } = useAuth();
  const { t, tError } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "settings">("overview");

  const donationsQ = useQuery({
    queryKey: ["bank", "donations", "", ""],
    queryFn: () => apiGet<Donation[]>("/bank/donations"),
    retry: false,
    enabled: !!user,
  });
  const penaltiesQ = useQuery({
    queryKey: ["penalties", user?.id],
    queryFn: () => apiGet<Penalty[]>(`/members/${user!.id}/penalties`),
    retry: false,
    enabled: !!user,
  });

  const [form, setForm] = useState({
    nickname: user?.nickname ?? "",
    city: user?.city ?? "",
    language: (user?.language ?? "ru") as Lang,
    game_id: user?.game_id ?? "",
    troop_type: user?.troop_type ?? "",
    power: user?.power ?? 0,
    telegram: user?.telegram ?? "",
    whatsapp: user?.whatsapp ?? "",
  });
  const [pw, setPw] = useState({ current_password: "", new_password: "" });

  const saveM = useMutation({
    mutationFn: () => apiPut<UserPublic>("/auth/settings", { ...form, power: Number(form.power) }),
    onSuccess: () => {
      toast.success(t("settings.saved"));
      void qc.invalidateQueries({ queryKey: ["auth"] });
    },
    onError: (e) => toast.error(tError(e instanceof ApiError ? (e.body as { detail?: unknown })?.detail : null)),
  });
  const pwM = useMutation({
    mutationFn: () => apiPut<{ ok: boolean }>("/auth/password", pw),
    onSuccess: () => {
      toast.success(t("settings.passwordSaved"));
      setPw({ current_password: "", new_password: "" });
    },
    onError: (e) => toast.error(tError(e instanceof ApiError ? (e.body as { detail?: unknown })?.detail : null)),
  });

  if (loading) {
    return (
      <AppShell>
        <PageHeader title={t("dash.title")} />
        <p className="text-white/40">{t("common.loading")}</p>
      </AppShell>
    );
  }
  if (!user) {
    return (
      <AppShell>
        <PageHeader title={t("dash.title")} subtitle={t("dash.subtitle")} />
        <SignInPrompt />
      </AppShell>
    );
  }

  const mine = (donationsQ.data ?? []).filter((d) => d.player_id === user.id).slice(0, 6);
  const granted = Object.keys(
    Object.fromEntries(Object.entries({}).map(([k, v]) => [k, v])),
  ) as string[];
  void granted;

  return (
    <AppShell>
      <PageHeader
        title={t("dash.title")}
        subtitle={t("dash.subtitle")}
        action={
          <div className="flex gap-2" data-testid="profile-tabs">
            {(["overview", "settings"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setTab(v)}
                data-testid={`profile-tab-${v}`}
                className={`font-heading rounded-full px-4 py-2 text-[11px] font-semibold uppercase transition-colors duration-300 ${
                  tab === v ? "bg-[#D4AF37] text-[#050505]" : "border border-[#D4AF37]/35 text-[#F5D76E]"
                }`}
              >
                {v === "overview" ? t("dash.title") : t("settings.title")}
              </button>
            ))}
          </div>
        }
      />
      <OfflineNotice show={donationsQ.isError} />

      <div className="glass gold-glow rounded-3xl p-7" data-testid="profile-card">
        <div className="flex flex-wrap items-center gap-5">
          <div className="font-heading grid h-20 w-20 place-items-center rounded-2xl border border-[#D4AF37]/50 bg-[#0D0D0D] text-2xl font-bold text-[#F5D76E]">
            {user.nickname.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-white" data-testid="profile-nickname">
              {user.nickname}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <RoleBadge role={user.role} />
              {user.officer_roles.map((s) => (
                <span
                  key={s}
                  data-testid={`profile-officer-${s}`}
                  className="rounded-full border border-[#D4AF37]/35 px-2.5 py-0.5 text-[10px] text-[#F5D76E] uppercase"
                >
                  {t(`officer.${s}`)}
                </span>
              ))}
              <span className="text-xs text-white/40">{user.email}</span>
            </div>
          </div>
        </div>
      </div>

      {tab === "overview" ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t("dash.city")} value={user.city} testid="profile-stat-city" />
            <Stat
              label={t("dash.joined")}
              value={new Date(user.joined_at).toLocaleDateString()}
              testid="profile-stat-joined"
            />
            <Stat
              label={t("dash.contribution")}
              value={user.contribution.toLocaleString()}
              testid="profile-stat-contribution"
            />
            <Stat label={t("dash.activity")} value={`${user.activity}%`} testid="profile-stat-activity" />
            <Stat label={t("dash.trucks")} value={user.truck_count} testid="profile-stat-trucks" />
            <Stat label={t("dash.warnings")} value={user.warning_count} testid="profile-stat-warnings" />
            <Stat label={t("dash.power")} value={user.power.toLocaleString()} testid="profile-stat-power" />
            <Stat label={t("dash.gameId")} value={user.game_id || "—"} testid="profile-stat-gameid" />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="glass rounded-2xl p-6" data-testid="profile-recent-donations">
              <h3 className="font-heading mb-4 text-lg font-semibold text-[#F5D76E]">{t("dash.recentDonations")}</h3>
              {mine.length === 0 ? (
                <EmptyState />
              ) : (
                <ul className="space-y-2">
                  {mine.map((d) => (
                    <li key={d.id} className="flex items-center justify-between rounded-xl bg-[#0D0D0D] px-4 py-2.5 text-sm">
                      <span className="text-white/70">{t(`bank.${d.resource}`)}</span>
                      <span className="text-[#F5D76E]">{d.amount.toLocaleString()}</span>
                      <span className="text-xs text-white/35">{t(`recruit.status.${d.status === "approved" ? "approved" : d.status === "rejected" ? "rejected" : "pending"}`)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="glass rounded-2xl p-6" data-testid="profile-penalties">
              <h3 className="font-heading mb-4 text-lg font-semibold text-[#F5D76E]">{t("dash.myPenalties")}</h3>
              {(penaltiesQ.data ?? []).length === 0 ? (
                <EmptyState />
              ) : (
                <ul className="space-y-2">
                  {(penaltiesQ.data ?? []).map((p) => (
                    <li key={p.id} className="rounded-xl bg-[#0D0D0D] px-4 py-2.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#F5D76E]">{t(`penalty.${p.kind}`)}</span>
                        <span className="text-xs text-white/35">{new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-1 text-white/60">{p.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <form
            data-testid="settings-form"
            className="glass space-y-3 rounded-2xl p-6"
            onSubmit={(e) => {
              e.preventDefault();
              saveM.mutate();
            }}
          >
            <h3 className="font-heading text-lg font-semibold text-[#F5D76E]">{t("settings.title")}</h3>
            <p className="text-xs text-white/40">{t("settings.subtitle")}</p>
            <input
              required
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              placeholder={t("auth.nickname")}
              data-testid="settings-nickname-input"
              className={`${inputCls} w-full`}
            />
            <input
              required
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder={t("auth.city")}
              data-testid="settings-city-input"
              className={`${inputCls} w-full`}
            />
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value as Lang })}
              data-testid="settings-language-select"
              className={`${inputCls} w-full`}
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <input
              value={form.game_id}
              onChange={(e) => setForm({ ...form, game_id: e.target.value })}
              placeholder={t("dash.gameId")}
              data-testid="settings-gameid-input"
              className={`${inputCls} w-full`}
            />
            <input
              value={form.troop_type}
              onChange={(e) => setForm({ ...form, troop_type: e.target.value })}
              placeholder={t("dash.troop")}
              data-testid="settings-troop-input"
              className={`${inputCls} w-full`}
            />
            <input
              type="number"
              min={0}
              value={form.power}
              onChange={(e) => setForm({ ...form, power: Number(e.target.value) })}
              placeholder={t("dash.power")}
              data-testid="settings-power-input"
              className={`${inputCls} w-full`}
            />
            <input
              value={form.telegram}
              onChange={(e) => setForm({ ...form, telegram: e.target.value })}
              placeholder={t("settings.telegram")}
              data-testid="settings-telegram-input"
              className={`${inputCls} w-full`}
            />
            <input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder={t("settings.whatsapp")}
              data-testid="settings-whatsapp-input"
              className={`${inputCls} w-full`}
            />
            <button type="submit" disabled={saveM.isPending} data-testid="settings-save-button" className={goldBtn}>
              {t("common.save")}
            </button>
          </form>

          <form
            data-testid="password-form"
            className="glass h-fit space-y-3 rounded-2xl p-6"
            onSubmit={(e) => {
              e.preventDefault();
              pwM.mutate();
            }}
          >
            <h3 className="font-heading text-lg font-semibold text-[#F5D76E]">{t("settings.changePassword")}</h3>
            <input
              required
              type="password"
              value={pw.current_password}
              onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
              placeholder={t("auth.currentPassword")}
              data-testid="password-current-input"
              className={`${inputCls} w-full`}
            />
            <input
              required
              minLength={6}
              type="password"
              value={pw.new_password}
              onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
              placeholder={t("auth.newPassword")}
              data-testid="password-new-input"
              className={`${inputCls} w-full`}
            />
            <button type="submit" disabled={pwM.isPending} data-testid="password-save-button" className={goldBtn}>
              {t("common.save")}
            </button>
            {can(user, "admin.access") ? (
              <p className="text-[11px] text-white/35">{t("tip.audit")}</p>
            ) : null}
          </form>
        </div>
      )}
    </AppShell>
  );
}
