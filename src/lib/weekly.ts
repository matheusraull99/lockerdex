/*
 * Eventos semanais de Elementais (Sprites) anunciados pela Epic, ancorados no horário de Nova York
 * (o horário de verão americano muda a hora em outros países; o cálculo abaixo já considera isso):
 *   segunda 9h → terça 9h   bônus de nível (2× XP e 2× Poeira; lendários e míticos mais comuns)
 *   quinta                  elemental ou variante novo (a Epic não informa a hora)
 *   sábado 15h30 e 21h30    Horas do Poder (1 h cada)
 */
const TZ = "America/New_York";

/** Diferença entre o horário local de `tz` e o UTC, no instante `t` (ms). */
function tzOffset(t: number, tz: string) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(t));
  const g = (k: string) => Number(p.find((x) => x.type === k)!.value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - t;
}

/** Instante (ms UTC) de uma data/hora de parede em Nova York. */
function nyToUtc(y: number, m: number, d: number, h: number, min: number) {
  const guess = Date.UTC(y, m, d, h, min);
  let t = guess - tzOffset(guess, TZ);
  const again = guess - tzOffset(t, TZ);
  if (again !== t) t = again;
  return t;
}

/** Data de hoje em Nova York (ano, mês 0-11, dia, dia da semana 0=domingo). */
function nyToday(now: number) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", weekday: "short" }).formatToParts(new Date(now));
  const g = (k: string) => p.find((x) => x.type === k)!.value;
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(g("weekday"));
  return { y: Number(g("year")), m: Number(g("month")) - 1, d: Number(g("day")), wd };
}

export interface Window {
  start: number;
  end: number;
}

/** Próximas janelas de um evento semanal (a atual, se estiver rolando, vem primeiro). */
function nextWindows(now: number, weekday: number, slots: [number, number, number][]): Window[] {
  const today = nyToday(now);
  const out: Window[] = [];
  for (let week = 0; week < 2 && out.length === 0; week++) {
    const ahead = ((weekday - today.wd + 7) % 7) + week * 7;
    for (const [h, min, hours] of slots) {
      const start = nyToUtc(today.y, today.m, today.d + ahead, h, min);
      const end = start + hours * 3600_000;
      if (end > now) out.push({ start, end });
    }
  }
  return out;
}

export type EventKey = "mon" | "thu" | "sat";

export interface WeeklyEvent {
  key: EventKey;
  windows: Window[]; // na quinta, a janela é o dia inteiro em Nova York (a hora exata não é divulgada)
  active: boolean;
}

export function weeklyEvents(now = Date.now()): WeeklyEvent[] {
  const list: { key: EventKey; windows: Window[] }[] = [
    { key: "mon", windows: nextWindows(now, 1, [[9, 0, 24]]) },
    { key: "thu", windows: nextWindows(now, 4, [[0, 0, 24]]) },
    { key: "sat", windows: nextWindows(now, 6, [[15, 30, 1], [21, 30, 1]]) },
  ];
  return list.map((e) => ({ ...e, active: e.windows.some((w) => w.start <= now && now < w.end) }));
}
