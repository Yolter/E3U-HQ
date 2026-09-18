import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Languages } from "lucide-react";
import { apiPost } from "@/lib/api";
import { useAutoTranslate } from "@/lib/autoTranslate";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/session";
import type { Role, TranslateResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE: Record<Role, string> = {
  R1: "border-white/15 text-white/60",
  R2: "border-white/25 text-white/75",
  R3: "border-[#8A6F22] text-[#C9A227]",
  R4: "border-[#D4AF37] text-[#F5D76E]",
  R5: "border-[#F5D76E] text-[#050505] bg-gradient-to-r from-[#F5D76E] to-[#D4AF37]",
};

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const { t } = useI18n();
  return (
    <span
      data-testid={`role-badge-${role}`}
      className={cn(
        "font-heading inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        TONE[role],
        className,
      )}
    >
      {t(`role.${role}`)}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8" data-testid="page-header">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="gold-text font-heading text-[1.6rem] leading-tight font-semibold sm:text-[2.2rem]"
            data-testid="page-title"
          >
            {title}
          </h1>
          {subtitle ? <p className="mt-2 max-w-xl text-sm text-white/55">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="hairline mt-5" />
    </header>
  );
}

export function EmptyState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div
      className="rounded-2xl border border-dashed border-[#D4AF37]/25 p-10 text-center text-sm text-white/45"
      data-testid="empty-state"
    >
      {label ?? t("common.empty")}
    </div>
  );
}

export function OfflineNotice({ show }: { show: boolean }) {
  const { t } = useI18n();
  if (!show) return null;
  return (
    <div
      className="mb-6 rounded-xl border border-[#D4AF37]/25 bg-[#1A1710] px-4 py-3 text-sm text-[#F5D76E]"
      data-testid="offline-notice"
    >
      {t("common.offline")}
    </div>
  );
}

export function SignInPrompt() {
  const { t } = useI18n();
  return (
    <div className="glass rounded-2xl p-8 text-center" data-testid="signin-prompt">
      <p className="text-white/70">{t("common.signInRequired")}</p>
      <Link
        to="/login"
        className="mt-4 inline-flex rounded-full bg-gradient-to-r from-[#F5D76E] to-[#D4AF37] px-6 py-2 text-sm font-semibold text-[#050505]"
        data-testid="signin-prompt-link"
      >
        {t("auth.login")}
      </Link>
    </div>
  );
}

export function NoPermission() {
  const { t } = useI18n();
  return (
    <div className="glass rounded-2xl p-8 text-center text-white/60" data-testid="no-permission">
      {t("common.noPermission")}
    </div>
  );
}

export function Stat({ label, value, testid }: { label: string; value: string | number; testid: string }) {
  return (
    <div className="glass rounded-2xl p-5" data-testid={testid}>
      <p className="font-heading text-[10px] tracking-[0.3em] text-white/40 uppercase">{label}</p>
      <p className="gold-text font-heading mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

export const inputCls =
  "rounded-xl border border-[#D4AF37]/25 bg-[#0D0D0D] px-3 py-2 text-sm text-white outline-none transition-colors duration-300 placeholder:text-white/25 focus:border-[#D4AF37]";

export const goldBtn =
  "rounded-xl bg-gradient-to-r from-[#F5D76E] to-[#D4AF37] px-5 py-2 text-sm font-bold text-[#050505] transition-transform duration-300 hover:scale-[1.015] disabled:opacity-60";

export const ghostBtn =
  "rounded-full border border-[#D4AF37]/40 px-4 py-1.5 text-xs font-semibold text-[#F5D76E] transition-colors duration-300 hover:bg-[#D4AF37]/15 disabled:opacity-40";

/** AI translation for any user-authored message. With auto-translate on (default),
 *  the message is translated into the member's language as soon as it loads; the
 *  original is always one click away. Results are cached server-side per message. */
export function TranslatableText({ text, testid }: { text: string; testid: string }) {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [auto] = useAutoTranslate();
  const [translated, setTranslated] = useState<string | null>(null);
  const [showing, setShowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchTranslation = useCallback(async () => {
    const res = await apiPost<TranslateResponse>("/ai/translate", { text, target_lang: lang });
    return res.translated;
  }, [text, lang]);

  // Auto mode: translate on load (and whenever the UI language changes).
  useEffect(() => {
    if (!auto || !user) return;
    let cancelled = false;
    setTranslated(null);
    setShowing(false);
    setLoading(true);
    void fetchTranslation()
      .then((value) => {
        if (cancelled) return;
        setTranslated(value);
        setShowing(value.trim() !== text.trim());
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [auto, user, fetchTranslation, text]);

  async function run() {
    if (translated) {
      setShowing((s) => !s);
      return;
    }
    setLoading(true);
    try {
      setTranslated(await fetchTranslation());
      setShowing(true);
    } catch {
      setTranslated(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-testid={testid}>
      <p className="text-sm whitespace-pre-wrap text-white/75">{showing && translated ? translated : text}</p>
      {user ? (
        <button
          type="button"
          onClick={run}
          disabled={loading}
          title={t("tip.translate")}
          data-testid={`${testid}-translate-button`}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#D4AF37]/80 transition-colors duration-300 hover:text-[#F5D76E]"
        >
          <Languages className="h-3.5 w-3.5" />
          {loading
            ? t("ai.translating")
            : showing
              ? t("ai.showOriginal")
              : t("ai.translate")}
        </button>
      ) : null}
      {showing && translated ? (
        <span className="ml-2 text-[10px] tracking-wide text-white/30 uppercase">{t("ai.translated")}</span>
      ) : null}
    </div>
  );
}
