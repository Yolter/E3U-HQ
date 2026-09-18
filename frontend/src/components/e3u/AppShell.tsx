import { Link, NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth, useSessionActions } from "@/lib/session";
import { useI18n, LANGS } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import { can, isOfficer } from "@/lib/permissions";
import { RoleBadge } from "@/components/e3u/ui";
import { AudioToggle } from "@/components/e3u/AudioToggle";
import { useAutoTranslate } from "@/lib/autoTranslate";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/types";

interface NavItem {
  to: string;
  key: TranslationKey;
  id: string;
}

const PRIMARY: NavItem[] = [
  { to: "/", key: "nav.hq", id: "hq" },
  { to: "/bank", key: "nav.bank", id: "bank" },
  { to: "/trucks", key: "nav.trucks", id: "trucks" },
  { to: "/members", key: "nav.members", id: "members" },
  { to: "/forum", key: "nav.forum", id: "forum" },
  { to: "/events", key: "nav.events", id: "events" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { endSession } = useSessionActions();
  const { t, lang, setLang } = useI18n();
  const [auto, setAuto] = useAutoTranslate();
  const navigate = useNavigate();

  const secondary: NavItem[] = [
    { to: "/recruitment", key: "nav.recruit", id: "recruit" },
    { to: "/codex", key: "nav.codex", id: "codex" },
    { to: "/assistant", key: "nav.assistant", id: "assistant" },
    { to: "/contact", key: "nav.contact", id: "contact" },
  ];
  if (can(user, "diplomacy.view")) secondary.push({ to: "/diplomacy", key: "nav.diplomacy", id: "diplomacy" });
  if (isOfficer(user)) secondary.push({ to: "/officer", key: "nav.officer", id: "officer" });
  if (can(user, "audit.view")) secondary.push({ to: "/audit", key: "nav.audit", id: "audit" });
  if (can(user, "admin.access")) secondary.push({ to: "/admin", key: "nav.admin", id: "admin" });

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "font-heading rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase transition-colors duration-300",
      isActive
        ? "bg-[#D4AF37]/15 text-[#F5D76E] shadow-[0_0_18px_-6px_rgba(212,175,55,0.8)]"
        : "text-white/55 hover:text-[#F5D76E]",
    );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-40 border-b border-[#D4AF37]/15 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5" data-testid="brand-logo">
            <span className="logo-ring font-heading grid h-9 w-9 place-items-center rounded-full border border-[#D4AF37]/55 bg-[#0A0A0A] text-[11px] font-bold text-[#F5D76E]">
              E3U
            </span>
            <span className="gold-text font-heading hidden text-lg font-semibold sm:block">E3U HQ</span>
          </Link>

          <nav className="ml-auto flex items-center gap-1 overflow-x-auto" data-testid="main-nav">
            {PRIMARY.map((l) => (
              <NavLink key={l.id} to={l.to} end={l.to === "/"} data-testid={`nav-link-${l.id}`} className={linkCls}>
                {t(l.key)}
              </NavLink>
            ))}
            <NavLink to="/profile" data-testid="nav-link-profile" className={linkCls}>
              {t("nav.profile")}
            </NavLink>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              data-testid="language-select"
              title={t("tip.language")}
              aria-label={t("auth.language")}
              className="rounded-full border border-[#D4AF37]/35 bg-[#111] px-2 py-1.5 text-xs text-[#F5D76E]"
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.short}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setAuto(!auto);
                toast.success(t(auto ? "ai.autoOff" : "ai.autoOn"));
              }}
              data-testid="auto-translate-toggle"
              title={t("ai.auto")}
              aria-pressed={auto}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full border transition-colors duration-300",
                auto
                  ? "border-[#D4AF37] bg-[#D4AF37]/20 text-[#F5D76E]"
                  : "border-white/15 text-white/40 hover:text-[#F5D76E]",
              )}
            >
              <Languages className="h-3.5 w-3.5" />
            </button>
            <AudioToggle />
            {user ? (
              <button
                type="button"
                data-testid="logout-button"
                onClick={async () => {
                  await endSession();
                  toast.success(t("auth.signedOut"));
                  navigate("/login");
                }}
                className="font-heading rounded-full border border-[#D4AF37]/35 px-3 py-1.5 text-[11px] font-semibold text-[#F5D76E] transition-colors duration-300 hover:bg-[#D4AF37]/15"
              >
                {t("auth.logout")}
              </button>
            ) : (
              <Link
                to="/login"
                data-testid="header-login-link"
                className="font-heading rounded-full bg-gradient-to-r from-[#F5D76E] to-[#D4AF37] px-4 py-1.5 text-[11px] font-bold text-[#050505]"
              >
                {t("auth.login")}
              </Link>
            )}
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 pb-2 sm:px-6" data-testid="secondary-nav">
          {secondary.map((l) => (
            <NavLink key={l.id} to={l.to} data-testid={`nav-link-${l.id}`} className={linkCls}>
              {t(l.key)}
            </NavLink>
          ))}
          {user ? (
            <span className="ml-auto flex items-center gap-2" data-testid="session-strip">
              <span className="text-[11px] text-white/40">{t("auth.signedInAs")}</span>
              <span className="text-[11px] font-semibold text-[#F5D76E]" data-testid="session-nickname">
                {user.nickname}
              </span>
              <RoleBadge role={user.role} />
            </span>
          ) : null}
        </div>
      </header>

      {user?.status === "pending" ? (
        <div className="bg-[#1A1710] px-4 py-2 text-center text-xs text-[#F5D76E]" data-testid="pending-banner">
          {t("auth.pendingBanner")}
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6" data-testid="page-main">
        {children}
      </main>

      <footer className="border-t border-[#D4AF37]/12 px-4 py-8 text-center text-xs text-white/30">
        {t("app.footer")}
      </footer>
    </div>
  );
}
