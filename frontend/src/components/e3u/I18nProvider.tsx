import { useEffect, useMemo, useState } from "react";
import { I18nContext, translate, translateError } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { useAuth } from "@/lib/session";

const STORAGE_KEY = "e3u.lang";
const VALID: Lang[] = ["ru", "en", "es", "tr"];

/** Browser language detection: the first navigator language that matches one of the
 *  four supported locales wins on a first visit; Russian is the fallback. */
function detectBrowserLang(): Lang | null {
  const candidates = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  for (const raw of candidates) {
    const code = raw.toLowerCase().split("-")[0] as Lang;
    if (VALID.includes(code)) return code;
  }
  return null;
}

/** Russian is the default; a saved choice always wins, and a signed-in member's
 *  stored language seeds the UI on first load of that browser. */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && VALID.includes(saved)) return saved;
    return detectBrowserLang() ?? "ru";
  });

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return; // an explicit choice wins forever
    if (user?.language && VALID.includes(user.language)) setLangState(user.language);
  }, [user?.language]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang: (l: Lang) => {
        localStorage.setItem(STORAGE_KEY, l);
        setLangState(l);
      },
      t: (key: TranslationKey, vars?: Record<string, string>) => translate(lang, key, vars),
      tError: (detail: unknown) => translateError(lang, detail),
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
