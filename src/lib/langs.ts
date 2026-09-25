import type en from "../i18n/locales/en.json";

export type Locale = typeof en;

/** Idiomas oferecidos, com o nome na própria língua. Novo idioma = novo JSON em i18n/locales + linha aqui. */
export const LANGS: { code: string; name: string }[] = [
  { code: "en", name: "English" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "pt-PT", name: "Português (Portugal)" },
  { code: "es", name: "Español (España)" },
  { code: "es-419", name: "Español (Latinoamérica)" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "nl", name: "Nederlands" },
  { code: "pl", name: "Polski" },
  { code: "tr", name: "Türkçe" },
  { code: "ru", name: "Русский" },
  { code: "uk", name: "Українська" },
  { code: "ar", name: "العربية" },
  { code: "hi", name: "हिन्दी" },
  { code: "th", name: "ไทย" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "id", name: "Bahasa Indonesia" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh-CN", name: "简体中文" },
  { code: "zh-TW", name: "繁體中文" },
];

export const loaders = import.meta.glob<{ default: Locale }>("../i18n/locales/*.json");
export const available = new Set(Object.keys(loaders).map((p) => p.split("/").pop()!.replace(".json", "")));
export const OFFERED = LANGS.filter((l) => available.has(l.code));

/** Escolhe o idioma pelo navegador: exato, depois variante regional, depois só a língua. */
export function detectLang(prefs: readonly string[]): string {
  const codes = OFFERED.map((l) => l.code);
  for (const raw of prefs) {
    const p = raw.toLowerCase();
    const exact = codes.find((c) => c.toLowerCase() === p);
    if (exact) return exact;
    const [base, region] = p.split("-");
    if (base === "pt") return region === "pt" || region === "ao" || region === "mz" ? "pt-PT" : "pt-BR";
    if (base === "es") return !region || region === "es" ? "es" : "es-419";
    if (base === "zh") return /^(tw|hk|mo|hant)/.test(region ?? "") || p.includes("hant") ? "zh-TW" : "zh-CN";
    if (base === "nb" || base === "nn") continue;
    const byBase = codes.find((c) => c.split("-")[0].toLowerCase() === base);
    if (byBase) return byBase;
  }
  return "en";
}

