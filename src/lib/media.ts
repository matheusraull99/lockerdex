import { useEffect, useState } from "react";

/** Celular: a mesma largura que o CSS usa para trocar de layout (max-width: 720px). */
export const MOBILE = "(max-width: 720px)";

export function useMedia(query: string) {
  const [on, setOn] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const ch = () => setOn(mq.matches);
    ch();
    mq.addEventListener("change", ch);
    return () => mq.removeEventListener("change", ch);
  }, [query]);
  return on;
}

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Vibração curta ao marcar (Android; o iPhone ignora). */
export function haptic(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* sem vibração */
  }
}
