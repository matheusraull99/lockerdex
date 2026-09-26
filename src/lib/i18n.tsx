import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "../i18n/locales/en.json";
import { storage } from "./collection";
import { available, detectLang, loaders, type Locale } from "./langs";
import { NAV_EVENT, pathLang, replacePathLang } from "./router";

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

function initialLang() {
  // Versão por idioma do endereço (/lockerdex/pt-BR/…, a que o Google indexa) vale sem ser salva.
  const fromUrl = pathLang();
  if (fromUrl && available.has(fromUrl)) return fromUrl;
  const saved = storage.lang();
  return saved && available.has(saved) ? saved : detectLang(navigator.languages ?? [navigator.language]);
}

let preloaded: { lang: string; L: Locale } | null = null;

/** Carrega o idioma antes de montar o app, para a página pronta não piscar em inglês. */
export async function preloadLocale() {
  const lang = initialLang();
  const load = loaders[`../i18n/locales/${lang}.json`];
  if (!load) return;
  try {
    preloaded = { lang, L: withFallback((await load()).default) };
  } catch {
    // sem rede para o arquivo do idioma: abre em inglês e tenta de novo no efeito abaixo
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(initialLang);
  const [L, setL] = useState<Locale>(() => (preloaded?.lang === lang ? preloaded.L : en));

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

  // Voltar/avançar entre /pt-BR/… e /ja/… acompanha o idioma do endereço (sem salvar).
  useEffect(() => {
    const on = () => {
      const p = pathLang();
      if (p && available.has(p)) setLangState(p);
    };
    addEventListener("popstate", on);
    addEventListener(NAV_EVENT, on);
    return () => {
      removeEventListener("popstate", on);
      removeEventListener(NAV_EVENT, on);
    };
  }, []);

  const setLang = useCallback((code: string) => {
    setLangState(code);
    storage.setLang(code);
    // Quem está numa versão /xx/ do endereço passa para a /yy/ do idioma escolhido.
    replacePathLang(code);
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
