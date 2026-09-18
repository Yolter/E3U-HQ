import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Particles } from "@/components/e3u/Particles";
import { useI18n } from "@/lib/i18n";

const DURATION_MS = 6200;

/**
 * Cinematic boot sequence: logo fade → uplink → dissolve into the HQ fly-in.
 * Placeholder for the future custom intro video: drop a file at /intro.mp4 and
 * it plays automatically behind the sequence.
 */
export function Intro({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Dissolve first, then hand over — so the HQ camera fly-in starts under the fade.
  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onDone, reduced ? 0 : 750);
  };

  useEffect(() => {
    if (reduced) {
      onDone();
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / DURATION_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        window.clearInterval(timer);
        leave();
      }
    }, 80);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const { t } = useI18n();

  return (
    <AnimatePresence>
      {!leaving ? (
        <motion.div
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06, filter: "blur(10px)" }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#050505]"
          data-testid="intro-overlay"
        >
          {/* Placeholder slot: a real /intro.mp4 takes over with zero code changes. */}
          <video
            ref={videoRef}
            src="/intro.mp4"
            muted
            playsInline
            autoPlay
            onCanPlay={() => setHasVideo(true)}
            className={hasVideo ? "absolute inset-0 h-full w-full object-cover opacity-55" : "hidden"}
          />
          <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgba(212,175,55,0.2),transparent_72%)]" />
          <Particles count={44} />

          {/* Stage 1 — logo fade */}
          <motion.div
            initial={{ scale: 0.82, opacity: 0, filter: "blur(18px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 text-center"
          >
            <div className="logo-ring sweep relative mx-auto mb-7 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#D4AF37]/50 bg-[#080808]">
              <span className="gold-text font-heading text-4xl font-bold tracking-tight">E3U</span>
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 12, letterSpacing: "0.28em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "-0.01em" }}
              transition={{ delay: 0.7, duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
              className="gold-text font-heading text-4xl font-bold sm:text-6xl"
            >
              E3U HQ
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 1.1 }}
              className="font-heading mt-3 text-[10px] tracking-[0.46em] text-white/45 uppercase"
            >
              {t("app.tagline")}
            </motion.p>
          </motion.div>

          {/* Stage 2 — uplink progress */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.9, duration: 0.9 }}
            className="relative z-10 mt-12 w-64"
          >
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#8A6F22] via-[#D4AF37] to-[#F5D76E] transition-[width] duration-100"
                style={{ width: `${progress}%` }}
                data-testid="intro-progress"
              />
            </div>
            <p className="font-heading mt-3 text-center text-[10px] tracking-[0.34em] text-white/35 uppercase">
              {t("intro.loading")}
            </p>
          </motion.div>

          <motion.button
            type="button"
            onClick={leave}
            data-testid="intro-skip-button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2, duration: 0.7 }}
            className="relative z-10 mt-10 rounded-full border border-[#D4AF37]/45 px-7 py-2.5 text-sm font-semibold text-[#F5D76E] transition-colors duration-300 hover:bg-[#D4AF37] hover:text-[#050505]"
          >
            {t("intro.skip")}
          </motion.button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
