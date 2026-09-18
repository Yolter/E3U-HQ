import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, LineChart, Line } from "recharts";
import { apiGet, apiPatch, apiPost, apiUrl, ApiError } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import {
  EmptyState,
  OfflineNotice,
  PageHeader,
  SignInPrompt,
  ghostBtn,
  goldBtn,
  inputCls,
} from "@/components/e3u/ui";
import { useAuth } from "@/lib/session";
import { can } from "@/lib/permissions";
import { useI18n } from "@/lib/i18n";
import type { BankSummary, Donation, ResourceKey } from "@/lib/types";

const RESOURCES: ResourceKey[] = ["cash", "arms", "cargo", "diamonds"];
const COLORS = ["#D4AF37", "#F5D76E", "#C9A227", "#8A6F22"];

export default function Bank() {
  const { user } = useAuth();
  const { t, tError } = useI18n();
  const qc = useQueryClient();
  const [resource, setResource] = useState<ResourceKey>("cash");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [filterResource, setFilterResource] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const summaryQ = useQuery({
    queryKey: ["bank", "summary"],
    queryFn: () => apiGet<BankSummary>("/bank/summary"),
    retry: false,
    enabled: !!user,
  });
  const donationsQ = useQuery({
    queryKey: ["bank", "donations", filterResource, filterStatus],
    queryFn: () => apiGet<Donation[]>(`/bank/donations?resource=${filterResource}&status=${filterStatus}`),
    retry: false,
    enabled: !!user,
  });

  const createM = useMutation({
    mutationFn: () => apiPost<Donation>("/bank/donations", { resource, amount: Number(amount), notes }),
    onSuccess: () => {
      toast.success(t("bank.logged"));
      setAmount("");
      setNotes("");
      void qc.invalidateQueries({ queryKey: ["bank"] });
    },
    onError: (e) => toast.error(tError(e instanceof ApiError ? (e.body as { detail?: unknown })?.detail : null)),
  });

  const reviewM = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" }) =>
      apiPatch<Donation>(`/bank/donations/${v.id}`, { status: v.status }),
    onSuccess: () => {
      toast.success(t("bank.reviewed"));
      void qc.invalidateQueries({ queryKey: ["bank"] });
      void qc.invalidateQueries({ queryKey: ["members"] });
    },
    onError: (e) => toast.error(tError(e instanceof ApiError ? (e.body as { detail?: unknown })?.detail : null)),
  });

  const rows = useMemo(() => {
    const list = donationsQ.data ?? [];
    return search ? list.filter((d) => d.player_nickname.toLowerCase().includes(search.toLowerCase())) : list;
  }, [donationsQ.data, search]);

  const chartData = RESOURCES.map((r) => ({ name: t(`bank.${r}`), value: summaryQ.data?.totals[r] ?? 0 }));
  const canApprove = can(user, "bank.approve");
  const canExport = can(user, "bank.export");

  return (
    <AppShell>
      <PageHeader
        title={t("bank.title")}
        subtitle={t("bank.subtitle")}
        action={
          canExport ? (
            <a
              href={apiUrl("/bank/export")}
              title={t("tip.export")}
              data-testid="bank-export-button"
              className={ghostBtn}
            >
              {t("bank.export")}
            </a>
          ) : null
        }
      />

      {!user ? (
        <SignInPrompt />
      ) : (
        <>
          <OfflineNotice show={summaryQ.isError || donationsQ.isError} />
          {!canApprove ? (
            <p className="mb-4 text-xs text-white/35" data-testid="bank-readonly-note">
              {t("common.readOnly")}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="bank-totals">
            {RESOURCES.map((r, i) => (
              <div key={r} className="glass rounded-2xl p-5" data-testid={`bank-total-${r}`}>
                <p className="font-heading text-[10px] tracking-[0.3em] text-white/40 uppercase">{t(`bank.${r}`)}</p>
                <p className="font-heading mt-2 text-2xl font-bold" style={{ color: COLORS[i] }}>
                  {(summaryQ.data?.totals[r] ?? 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="glass rounded-2xl p-6 lg:col-span-2" data-testid="bank-chart">
              <h3 className="font-heading mb-4 text-lg font-semibold text-[#F5D76E]">{t("bank.byResource")}</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#7A756A" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#7A756A" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#111", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 12 }}
                      formatter={(value: number) => value.toLocaleString()}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <h3 className="font-heading mt-6 mb-2 text-sm font-semibold text-[#F5D76E]">{t("bank.timeline")}</h3>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summaryQ.data?.timeline ?? []}>
                    <XAxis dataKey="day" stroke="#7A756A" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#7A756A" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#111", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 12 }}
                      formatter={(value: number) => value.toLocaleString()}
                    />
                    <Line type="monotone" dataKey="amount" stroke="#F5D76E" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass rounded-2xl p-6" data-testid="bank-top-contributors">
              <h3 className="font-heading mb-4 text-lg font-semibold text-[#F5D76E]">{t("bank.topContributors")}</h3>
              <ol className="space-y-2">
                {(summaryQ.data?.top_contributors ?? []).map((c, i) => (
                  <li key={c.nickname} className="flex justify-between rounded-xl bg-[#0D0D0D] px-4 py-2 text-sm">
                    <span className="text-white/70">
                      {i + 1}. {c.nickname}
                    </span>
                    <span className="text-[#F5D76E]">{c.amount.toLocaleString()}</span>
                  </li>
                ))}
                {(summaryQ.data?.top_contributors ?? []).length === 0 ? (
                  <li className="text-sm text-white/40">{t("common.empty")}</li>
                ) : null}
              </ol>
            </div>
          </div>

          <div className="glass mt-6 rounded-2xl p-6" data-testid="bank-donate-form">
            <h3 className="font-heading mb-4 text-lg font-semibold text-[#F5D76E]">{t("bank.deposit")}</h3>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (Number(amount) > 0) createM.mutate();
                else toast.error(t("valid.amountPositive"));
              }}
            >
              <select
                value={resource}
                onChange={(e) => setResource(e.target.value as ResourceKey)}
                data-testid="donation-resource-select"
                className={inputCls}
              >
                {RESOURCES.map((r) => (
                  <option key={r} value={r}>
                    {t(`bank.${r}`)}
                  </option>
                ))}
              </select>
              <input
                required
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t("bank.amount")}
                data-testid="donation-amount-input"
                className={inputCls}
              />
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("bank.notes")}
                data-testid="donation-notes-input"
                className={`${inputCls} flex-1`}
              />
              <button type="submit" disabled={createM.isPending} data-testid="donation-submit-button" className={goldBtn}>
                {t("common.submit")}
              </button>
            </form>
          </div>

          <div className="glass mt-6 rounded-2xl p-6" data-testid="bank-history">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h3 className="font-heading mr-auto text-lg font-semibold text-[#F5D76E]">{t("bank.history")}</h3>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("common.search")}
                data-testid="bank-search-input"
                className={inputCls}
              />
              <select
                value={filterResource}
                onChange={(e) => setFilterResource(e.target.value)}
                data-testid="bank-resource-filter"
                className={inputCls}
              >
                <option value="">{t("common.all")}</option>
                {RESOURCES.map((r) => (
                  <option key={r} value={r}>
                    {t(`bank.${r}`)}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                data-testid="bank-status-filter"
                className={inputCls}
              >
                <option value="">{t("common.all")}</option>
                <option value="pending">{t("recruit.status.pending")}</option>
                <option value="awaiting_second">{t("bank.awaitingSecond")}</option>
                <option value="approved">{t("recruit.status.approved")}</option>
                <option value="rejected">{t("recruit.status.rejected")}</option>
              </select>
            </div>

            {rows.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[10px] tracking-[0.2em] text-white/35 uppercase">
                    <tr>
                      <th className="py-2 pr-4">{t("bank.player")}</th>
                      <th className="py-2 pr-4">{t("bank.resource")}</th>
                      <th className="py-2 pr-4">{t("bank.amount")}</th>
                      <th className="py-2 pr-4">{t("bank.date")}</th>
                      <th className="py-2 pr-4">{t("bank.approvedBy")}</th>
                      <th className="py-2 pr-4">{t("bank.notes")}</th>
                      <th className="py-2">{t("bank.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((d) => (
                      <tr key={d.id} className="border-t border-white/5" data-testid={`donation-row-${d.id}`}>
                        <td className="py-2.5 pr-4 text-white/80">{d.player_nickname}</td>
                        <td className="py-2.5 pr-4 text-white/60">{t(`bank.${d.resource}`)}</td>
                        <td className="py-2.5 pr-4 text-[#F5D76E]">{d.amount.toLocaleString()}</td>
                        <td className="py-2.5 pr-4 text-white/45">{new Date(d.created_at).toLocaleDateString()}</td>
                        <td className="py-2.5 pr-4 text-white/45">{d.approved_by ?? "—"}</td>
                        <td className="py-2.5 pr-4 text-white/35">{d.notes || "—"}</td>
                        <td className="py-2.5">
                          {(d.status === "pending" || d.status === "awaiting_second") && canApprove ? (
                            <span className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={d.first_approved_by === user.nickname}
                                onClick={() => reviewM.mutate({ id: d.id, status: "approved" })}
                                data-testid={`donation-approve-${d.id}`}
                                className="rounded-full bg-[#D4AF37] px-3 py-1 text-[10px] font-bold text-[#050505] disabled:opacity-40"
                              >
                                {d.status === "awaiting_second" ? t("bank.secondApprove") : t("bank.approve")}
                              </button>
                              <button
                                type="button"
                                onClick={() => reviewM.mutate({ id: d.id, status: "rejected" })}
                                data-testid={`donation-reject-${d.id}`}
                                className="rounded-full border border-white/20 px-3 py-1 text-[10px] text-white/60"
                              >
                                {t("bank.reject")}
                              </button>
                              {d.status === "awaiting_second" ? (
                                <span className="text-[10px] text-white/40" data-testid={`donation-awaiting-${d.id}`}>
                                  {t("bank.awaitingSecond")}
                                </span>
                              ) : null}
                            </span>
                          ) : d.status === "awaiting_second" ? (
                            <span className="text-xs text-[#F5D76E]/70" data-testid={`donation-status-${d.id}`}>
                              {t("bank.awaitingSecond")}
                            </span>
                          ) : (
                            <span className="text-xs text-white/50" data-testid={`donation-status-${d.id}`}>
                              {t(`recruit.status.${d.status === "approved" ? "approved" : d.status === "rejected" ? "rejected" : "pending"}`)}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
