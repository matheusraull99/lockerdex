import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "../i18n/locales/en.json";
import { storage } from "./collection";
import { available, detectLang, loaders, type Locale } from "./langs";

export type { Locale };

type Vars = Record<string, string | number>;
type UiKey = keyof Locale["ui"];

interface I18n {
  lang: string;
  dir: "ltr" | "rtl";
  L: Locale;
  setLang: (code: string) => void;
  t: (key: UiKey, vars?: Vars) => string;
  nf: (n: number) => string;
}

const Ctx = createContext<I18n | null>(null);

function fill(s: string, vars?: Vars) {
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`)) : s;
}

/** Mescla com o inglês: chave que faltar no idioma cai no texto em inglês. */
function withFallback(loc: Locale): Locale {
  const merge = (a: any, b: any): any => {
    if (typeof a !== "object" || a === null || Array.isArray(a)) return b ?? a;
    const out: any = { ...a };
    for (const k of Object.keys(b ?? {})) out[k] = merge(a[k], b[k]);
    return out;
  };
  return merge(en, loc);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(() => {
    const saved = storage.lang();
    return saved && available.has(saved) ? saved : detectLang(navigator.languages ?? [navigator.language]);
  });
  const [L, setL] = useState<Locale>(en);

  useEffect(() => {
    let alive = true;
    const load = loaders[`../i18n/locales/${lang}.json`];
    if (!load) return;
    load().then((m) => alive && setL(withFallback(m.default)));
    return () => {
      alive = false;
    };
  }, [lang]);

  const dir = (L.meta.dir === "rtl" ? "rtl" : "ltr") as "ltr" | "rtl";
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((code: string) => {
    setLangState(code);
    storage.setLang(code);
  }, []);

  const value = useMemo<I18n>(() => {
    const fmt = new Intl.NumberFormat(lang);
    return {
      lang,
      dir,
      L,
      setLang,
      t: (key, vars) => fill(L.ui[key] ?? en.ui[key] ?? key, vars),
      nf: (n) => fmt.format(n),
    };
  }, [lang, dir, L, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n fora do I18nProvider");
  return v;
}
