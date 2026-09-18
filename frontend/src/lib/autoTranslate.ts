/**
 * Auto-translate preference (persisted in localStorage, shared across components
 * without a provider). When on, every user-authored message renders in the member's
 * selected language as soon as it loads; the original is one click away.
 */
import { useSyncExternalStore } from "react";

const KEY = "e3u.autoTranslate";
const listeners = new Set<() => void>();

let enabled = (() => {
  const saved = localStorage.getItem(KEY);
  return saved === null ? true : saved === "1";
})();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function setAutoTranslate(next: boolean) {
  enabled = next;
  localStorage.setItem(KEY, next ? "1" : "0");
  listeners.forEach((cb) => cb());
}

export function useAutoTranslate(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => enabled,
    () => true,
  );
  return [value, setAutoTranslate];
}
