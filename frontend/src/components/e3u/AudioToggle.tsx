import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * Ambient audio. Placeholder: drop a file at /ambient.mp3 and it plays on unmute.
 * Muted by default — browsers block autoplay with sound and it is the polite default.
 */
export function AudioToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = muted;
    if (!muted) void el.play().catch(() => undefined);
    else el.pause();
  }, [muted]);

  return (
    <>
      <audio ref={audioRef} src="/ambient.mp3" loop preload="none" />
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute ambient music" : "Mute ambient music"}
        data-testid="audio-mute-toggle"
        className="grid h-9 w-9 place-items-center rounded-full border border-[#D4AF37]/35 text-[#F5D76E] transition-colors duration-300 hover:bg-[#D4AF37]/15"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </>
  );
}
