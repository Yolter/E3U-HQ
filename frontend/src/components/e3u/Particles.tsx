import { useMemo } from "react";

/** Ambient gold motes. Pure CSS so it stays cheap on mobile and respects reduced motion. */
export function Particles({ count = 28 }: { count?: number }) {
  const motes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: (i * 37) % 100,
        bottom: -((i * 23) % 60),
        size: 1 + (i % 3),
        duration: 9 + (i % 7) * 1.7,
        delay: (i % 11) * 0.8,
        opacity: 0.25 + (i % 5) * 0.12,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden data-testid="ambient-particles">
      {motes.map((m, i) => (
        <span
          key={i}
          className="particle absolute rounded-full bg-[#F5D76E]"
          style={{
            left: `${m.left}%`,
            bottom: `${m.bottom}px`,
            width: m.size,
            height: m.size,
            opacity: m.opacity,
            animationDuration: `${m.duration}s`,
            animationDelay: `${m.delay}s`,
            boxShadow: "0 0 8px rgba(245,215,110,0.9)",
          }}
        />
      ))}
    </div>
  );
}
