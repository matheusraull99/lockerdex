import { createContext, useContext } from "react";

/** Ações globais do app que qualquer página pode chamar. */
export interface Ui {
  toast: (msg: string) => void;
  openInstall: () => void;
  openFeedback: () => void;
  canInstall: boolean;
}

export const UiContext = createContext<Ui>({ toast: () => {}, openInstall: () => {}, openFeedback: () => {}, canInstall: false });
export const useUi = () => useContext(UiContext);

/** Fim da temporada atual (data da comunidade; o horário exato sai perto do fim). */
export const SEASON_END = "2026-11-01T09:00:00Z";
export const NEXT_SEASON_START = "2026-11-01T09:00:00Z";

/** "em 5 horas", "há 3 dias": Intl já resolve plural e ordem em cada idioma. */
export function relTime(lang: string, targetMs: number, now = Date.now()) {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const diff = (targetMs - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400 * 2) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 60) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365 * 2) return rtf.format(Math.round(diff / (86400 * 30.4)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

export const fmtDate = (lang: string, iso: string, style: "long" | "medium" = "long") =>
  new Intl.DateTimeFormat(lang, { dateStyle: style, timeZone: "UTC" }).format(new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso));
