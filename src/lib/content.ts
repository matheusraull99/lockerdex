import type { Levels, Rarity, Slot, Sprite } from "./data";
import type { Locale } from "./i18n";

type Sprites = Locale["sprites"];

/** Nome em inglês de cada elemental (de seasons.json), para os que ainda não têm tradução nos idiomas. */
export const fallbackNames: Record<string, string> = {};

export function spriteText(L: Locale, key: string) {
  const s = (L.sprites as Record<string, Sprites[keyof Sprites] | undefined>)[key];
  return { name: s?.name ?? fallbackNames[key] ?? key, ability: s?.ability ?? [], levels: (s as { levels?: string } | undefined)?.levels ?? "" };
}

export const spriteName = (L: Locale, sp: Sprite) => spriteText(L, sp.key).name;

type T = (key: "season.label" | "season.short" | "season.miniLabel" | "season.miniShort", vars: Record<string, string | number>) => string;

/** "Capítulo 7 · Temporada 4" / "C7 T4"; na minitemporada, "Capítulo 7 · Minitemporada" / "C7 Mini". */
export function seasonName(t: T, s: { chapter: number; season: number; mini?: boolean }, short = false) {
  if (s.mini) return t(short ? "season.miniShort" : "season.miniLabel", { chapter: s.chapter });
  return t(short ? "season.short" : "season.label", { chapter: s.chapter, season: s.season });
}

export function variantText(L: Locale, key: string) {
  const v = (L.variants as Record<string, { label: string; bonus: string } | undefined>)[key];
  return { label: v?.label ?? key, bonus: v?.bonus ?? "" };
}

export const rarityLabel = (L: Locale, r: Rarity) => L.rarity[r];

export const locationLabel = (L: Locale, key: string) =>
  (L.locations as Record<string, string | undefined>)[key] ?? L.locations.unknown;

export function slotLabel(L: Locale, s: Slot) {
  return `${spriteName(L, s.sprite)} · ${variantText(L, s.variant).label}`;
}

/** Valores por nível já formatados no idioma: "3,5 s", "+40 / 10%". */
export function levelValues(lv: Levels, lang: string): string[] {
  const nf = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
  const one = (n: number, unit = "") => {
    const sign = lv.plus && n > 0 ? "+" : "";
    const sp = unit === "s" || unit === "m" ? " " : "";
    return `${sign}${nf.format(n)}${sp}${unit}`;
  };
  return lv.values.map((v) =>
    Array.isArray(v) ? v.map((n, i) => one(n, lv.units?.[i] ?? "")).join(" / ") : one(v, lv.unit ?? ""),
  );
}
