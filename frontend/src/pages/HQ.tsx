import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { apiGet } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import { HQScene } from "@/components/e3u/HQScene";
import type { Hotspot } from "@/components/e3u/HQScene";
import { Intro } from "@/components/e3u/Intro";
import { Particles } from "@/components/e3u/Particles";
import { useAuth } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import type { BankSummary } from "@/lib/types";

// Holographic node ring around the headquarters — one per sector.
const HOTSPOTS: Hotspot[] = [
  { id: "bank", label: "Bank", to: "/bank", position: [-4.15, 1.75, 2.1] },
  { id: "trucks", label: "Trucks", to: "/trucks", position: [4.25, 1.15, 2.3] },
  { id: "forum", label: "Forum", to: "/forum", position: [-2.95, 0.15, 3.85] },
  { id: "events", label: "Events", to: "/events", position: [3.1, 2.85, -1.7] },
  { id: "members", label: "Members", to: "/members", position: [0, 4.55, 0.1] },
  { id: "profile", label: "Profile", to: "/profile", position: [2.35, -0.25, 3.95] },
];

const SECTORS = [
  { to: "/bank", title: "Clan Bank", copy: "Ledger, approvals, resource totals." },
  { to: "/trucks", title: "Trucks", copy: "Convoy schedule and participation." },
  { to: "/members", title: "Members", copy: "Roster, roles and online status." },
  { to: "/forum", title: "Forum", copy: "Seven boards from announcements to chat." },
  { to: "/events", title: "Events", copy: "Countdowns and clan-wide operations." },
  { to: "/profile", title: "Profile", copy: "Your contribution and activity." },
];

export default function HQ() {
  const [introDone, setIntroDone] = useState(() => sessionStorage.getItem("e3u.intro") === "done");
  const { user } = useAuth();
  const { t } = useI18n();
  const { data: summary, isError } = useQuery({
    queryKey: ["bank", "summary"],
    queryFn: () => apiGet<BankSummary>("/bank/summary"),
    retry: false,
    enabled: !!user,
  });

  const finishIntro = () => {
    sessionStorage.setItem("e3u.intro", "done");
    setIntroDone(true);
  };

  if (!introDone) return <Intro onDone={finishIntro} />;

  const totals = !isError && summary ? summary.totals : null;

  return (
    <AppShell>
      {/* HQ reveal → UI fade-in, staged after the camera fly-in starts. */}
      <motion.section
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="glass relative overflow-hidden rounded-3xl"
        data-testid="hq-hero"
      >
        <Particles />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F5D76E]/70 to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.9, ease: "easeOut" }}
          className="relative z-10 px-6 pt-9 sm:px-10"
        >
          <p className="font-heading text-[10px] tracking-[0.46em] text-[#D4AF37]/70 uppercase">
            {t("app.tagline")}
          </p>
          {/* Title deliberately ~35% smaller than the original display size. */}
          <h1
            className="gold-text font-heading mt-2.5 text-[1.65rem] leading-tight font-semibold sm:text-[2.5rem]"
            data-testid="hq-title"
          >
            {t("hq.title")}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-white/50">{t("hq.subtitle")}</p>
        </motion.div>

        <HQScene hotspots={HOTSPOTS} />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050505] to-transparent" />
      </motion.section>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.8 }}
        className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="hq-vault-strip"
      >
        {(["cash", "arms", "cargo", "diamonds"] as const).map((key, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15 + i * 0.08, duration: 0.5 }}
            className="glass rounded-2xl p-5"
            data-testid={`hq-vault-${key}`}
          >
            <p className="font-heading text-[10px] tracking-[0.32em] text-white/40 uppercase">{key}</p>
            <p className="gold-text font-heading mt-2 text-2xl font-bold">
              {totals ? totals[key].toLocaleString() : "—"}
            </p>
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTORS.map((s, i) => (
          <motion.div
            key={s.to}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 + i * 0.05, duration: 0.5 }}
          >
            <Link
              to={s.to}
              data-testid={`hq-sector-${s.to.replace("/", "")}`}
              className="glass group flex h-full flex-col justify-between rounded-2xl p-6 hover:-translate-y-0.5"
            >
              <h3 className="font-heading text-lg font-semibold text-[#F5D76E]">{s.title}</h3>
              <p className="mt-2 text-sm text-white/50">{s.copy}</p>
              <span className="font-heading mt-5 text-[10px] tracking-[0.3em] text-[#D4AF37]/70 uppercase transition-transform duration-300 group-hover:translate-x-1">
                Enter →
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}
