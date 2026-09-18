import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiUrl } from "@/lib/api";
import { AppShell } from "@/components/e3u/AppShell";
import { PageHeader, SignInPrompt, ghostBtn, goldBtn, inputCls } from "@/components/e3u/ui";
import { useAuth } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import type { AssistantMessage } from "@/lib/types";

export default function Assistant() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const historyQ = useQuery({
    queryKey: ["ai", "history"],
    queryFn: () => apiGet<AssistantMessage[]>("/ai/history"),
    retry: false,
    enabled: !!user,
  });

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setStreaming("");
    const asked = question;
    setQuestion("");
    try {
      // SSE over POST: the typed helpers are JSON-only, so the stream is read directly.
      const res = await fetch(apiUrl("/ai/chat"), {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: asked, lang }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (line.startsWith("data: ")) {
            acc += line.slice(6);
            setStreaming(acc);
            boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
          }
        }
      }
    } finally {
      setBusy(false);
      setStreaming("");
      await qc.invalidateQueries({ queryKey: ["ai", "history"] });
    }
  }

  const messages = historyQ.data ?? [];

  return (
    <AppShell>
      <PageHeader
        title={t("ai.title")}
        subtitle={t("ai.subtitle")}
        action={
          user ? (
            <button
              type="button"
              data-testid="assistant-clear-button"
              className={ghostBtn}
              onClick={async () => {
                await apiDelete("/ai/history");
                await qc.invalidateQueries({ queryKey: ["ai", "history"] });
              }}
            >
              {t("ai.clear")}
            </button>
          ) : null
        }
      />

      {!user ? (
        <SignInPrompt />
      ) : (
        <>
          <div ref={boxRef} className="glass max-h-[52vh] space-y-3 overflow-y-auto rounded-2xl p-6" data-testid="assistant-thread">
            {messages.length === 0 && !streaming ? (
              <p className="text-sm text-white/40">{t("ai.empty")}</p>
            ) : null}
            {messages.map((m) => (
              <div
                key={m.id}
                data-testid={`assistant-message-${m.role}`}
                className={`rounded-xl px-4 py-3 text-sm ${
                  m.role === "user" ? "bg-[#1A1710] text-white/80" : "bg-[#0D0D0D] text-white/70"
                }`}
              >
                <p className="mb-1 text-[10px] tracking-[0.2em] text-[#D4AF37]/70 uppercase">
                  {m.role === "user" ? user.nickname : t("ai.title")}
                </p>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {streaming ? (
              <div className="rounded-xl bg-[#0D0D0D] px-4 py-3 text-sm text-white/70" data-testid="assistant-streaming">
                <p className="mb-1 text-[10px] tracking-[0.2em] text-[#D4AF37]/70 uppercase">{t("ai.title")}</p>
                <p className="whitespace-pre-wrap">{streaming}</p>
              </div>
            ) : null}
            {busy && !streaming ? <p className="text-xs text-white/35">{t("ai.thinking")}</p> : null}
          </div>

          <form onSubmit={ask} data-testid="assistant-form" className="mt-4 flex flex-wrap gap-3">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("ai.placeholder")}
              data-testid="assistant-input"
              className={`${inputCls} flex-1`}
            />
            <button type="submit" disabled={busy} data-testid="assistant-send-button" className={goldBtn}>
              {busy ? t("ai.thinking") : t("ai.send")}
            </button>
          </form>
        </>
      )}
    </AppShell>
  );
}
