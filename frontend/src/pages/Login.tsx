import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { apiPost, ApiError } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import { Particles } from "@/components/e3u/Particles";
import { goldBtn, inputCls } from "@/components/e3u/ui";
import { useSessionActions } from "@/lib/session";
import { useI18n, LANGS } from "@/lib/i18n";
import type { Lang, UserPublic } from "@/lib/types";

type Mode = "login" | "register" | "forgot" | "reset";

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <AppShell>
      <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl glass p-8">
        <Particles count={16} />
        <div className="relative z-10">
          <h1 className="gold-text font-heading text-[1.6rem] font-bold" data-testid="auth-title">
            {title}
          </h1>
          {subtitle ? <p className="mt-2 text-sm text-white/45">{subtitle}</p> : null}
          {children}
        </div>
      </div>
    </AppShell>
  );
}

export function AuthCard({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { beginSession } = useSessionActions();
  const { t, tError, lang } = useI18n();
  const [form, setForm] = useState({
    nickname: "",
    email: "",
    password: "",
    city: "",
    language: lang as Lang,
    remember: false,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "login")
        return apiPost<UserPublic>("/auth/login", {
          email: form.email,
          password: form.password,
          remember: form.remember,
        });
      if (mode === "register")
        return apiPost<UserPublic>("/auth/register", {
          nickname: form.nickname,
          email: form.email,
          password: form.password,
          city: form.city,
          language: form.language,
        });
      if (mode === "forgot") return apiPost<{ ok: boolean }>("/auth/forgot-password", { email: form.email });
      return apiPost<{ ok: boolean }>("/auth/reset-password", {
        token: params.get("token") ?? "",
        password: form.password,
      });
    },
    onSuccess: async (res) => {
      if (mode === "forgot") {
        toast.success(t("auth.forgotSent"));
        return;
      }
      if (mode === "reset") {
        toast.success(t("auth.resetDone"));
        navigate("/login");
        return;
      }
      await beginSession();
      toast.success(t("auth.welcome", { name: (res as UserPublic).nickname }));
      navigate("/profile");
    },
    onError: (e) => toast.error(tError(e instanceof ApiError ? (e.body as { detail?: unknown })?.detail : null)),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const titles: Record<Mode, string> = {
    login: t("auth.login"),
    register: t("auth.register"),
    forgot: t("auth.forgotTitle"),
    reset: t("auth.resetTitle"),
  };
  const subs: Record<Mode, string> = {
    login: t("auth.loginSub"),
    register: t("auth.registerSub"),
    forgot: t("auth.forgotHint"),
    reset: t("auth.resetTitle"),
  };

  return (
    <Shell title={titles[mode]} subtitle={subs[mode]}>
      <form
        data-testid="auth-form"
        className="mt-7 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        {mode === "register" ? (
          <label className="block">
            <span className="mb-1.5 block text-xs tracking-wide text-white/50 uppercase">{t("auth.nickname")}</span>
            <input
              required
              minLength={2}
              value={form.nickname}
              onChange={set("nickname")}
              data-testid="auth-nickname-input"
              className={`${inputCls} w-full`}
            />
          </label>
        ) : null}

        {mode !== "reset" ? (
          <label className="block">
            <span className="mb-1.5 block text-xs tracking-wide text-white/50 uppercase">{t("auth.email")}</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={set("email")}
              data-testid="auth-email-input"
              className={`${inputCls} w-full`}
            />
          </label>
        ) : null}

        {mode !== "forgot" ? (
          <label className="block">
            <span className="mb-1.5 block text-xs tracking-wide text-white/50 uppercase">
              {mode === "reset" ? t("auth.newPassword") : t("auth.password")}
            </span>
            <input
              required
              minLength={6}
              type="password"
              value={form.password}
              onChange={set("password")}
              data-testid="auth-password-input"
              className={`${inputCls} w-full`}
            />
          </label>
        ) : null}

        {mode === "register" ? (
          <>
            <label className="block">
              <span className="mb-1.5 block text-xs tracking-wide text-white/50 uppercase">{t("auth.city")}</span>
              <input
                required
                value={form.city}
                onChange={set("city")}
                data-testid="auth-city-input"
                className={`${inputCls} w-full`}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs tracking-wide text-white/50 uppercase">{t("auth.language")}</span>
              <select
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as Lang }))}
                data-testid="auth-language-select"
                className={`${inputCls} w-full`}
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        {mode === "login" ? (
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-white/55">
              <input
                type="checkbox"
                checked={form.remember}
                onChange={(e) => setForm((f) => ({ ...f, remember: e.target.checked }))}
                data-testid="auth-remember-checkbox"
                className="h-4 w-4 accent-[#D4AF37]"
              />
              {t("auth.remember")}
            </label>
            <Link to="/forgot-password" data-testid="auth-forgot-link" className="text-xs text-[#F5D76E]">
              {t("auth.forgot")}
            </Link>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={mutation.isPending}
          data-testid="auth-submit-button"
          className={`${goldBtn} w-full py-3`}
        >
          {mutation.isPending ? t("common.working") : titles[mode]}
        </button>
      </form>

      {mode === "login" || mode === "register" ? (
        <p className="mt-6 text-center text-sm text-white/45">
          {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
          <Link
            to={mode === "login" ? "/register" : "/login"}
            data-testid="auth-switch-link"
            className="font-semibold text-[#F5D76E]"
          >
            {mode === "login" ? t("auth.register") : t("auth.login")}
          </Link>
        </p>
      ) : null}
    </Shell>
  );
}

export default function Login() {
  return <AuthCard mode="login" />;
}
