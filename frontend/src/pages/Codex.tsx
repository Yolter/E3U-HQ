import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import { EmptyState, OfflineNotice, PageHeader } from "@/components/e3u/ui";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import type { CodexResponse } from "@/lib/types";

export default function Codex() {
  const { t } = useI18n();
  const [section, setSection] = useState("");

  const { data, isError } = useQuery({
    queryKey: ["codex", section],
    queryFn: () => apiGet<CodexResponse>(`/encyclopedia?section=${section}`),
    retry: false,
  });

  const sections = data?.sections ?? [];
  const entries = data?.entries ?? [];

  return (
    <AppShell>
      <PageHeader title={t("codex.title")} subtitle={t("codex.subtitle")} />
      <OfflineNotice show={isError} />

      <div className="mb-6 flex flex-wrap gap-2" data-testid="codex-sections">
        <button
          type="button"
          onClick={() => setSection("")}
          data-testid="codex-section-all"
          className={`font-heading rounded-full px-4 py-2 text-[11px] font-semibold uppercase ${
            section === "" ? "bg-[#D4AF37] text-[#050505]" : "border border-[#D4AF37]/30 text-[#F5D76E]"
          }`}
        >
          {t("common.all")}
        </button>
        {sections.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            data-testid={`codex-section-${s}`}
            className={`font-heading rounded-full px-4 py-2 text-[11px] font-semibold uppercase ${
              section === s ? "bg-[#D4AF37] text-[#050505]" : "border border-[#D4AF37]/30 text-[#F5D76E]"
            }`}
          >
            {t(`codex.section.${s}` as TranslationKey)}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="codex-entries">
          {entries.map((e) => (
            <article key={e.id} className="glass rounded-2xl p-6" data-testid={`codex-entry-${e.id}`}>
              <h3 className="font-heading text-lg font-semibold text-[#F5D76E]">{e.title}</h3>
              <p className="mt-1 text-xs tracking-wide text-white/35 uppercase">
                {t(`codex.section.${e.section}` as TranslationKey)}
              </p>
              <p className="mt-3 text-sm text-white/70">{e.summary}</p>
              <p className="mt-2 text-sm text-white/45">{e.body}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {e.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[#D4AF37]/20 px-2 py-0.5 text-[10px] text-white/40">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
