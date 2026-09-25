import { useEffect, useState } from "react";

/** Idioma do app → idioma aceito pela fortnite-api.com (nomes oficiais do jogo). */
const API_LANG: Record<string, string> = {
  en: "en", "pt-BR": "pt-BR", "pt-PT": "pt-BR", es: "es", "es-419": "es-419", fr: "fr", de: "de", it: "it",
  nl: "en", pl: "pl", tr: "tr", ru: "ru", uk: "en", ar: "ar", hi: "en", th: "th", vi: "vi", id: "id",
  ja: "ja", ko: "ko", "zh-CN": "zh-Hans", "zh-TW": "zh-Hant",
};
export const apiLang = (lang: string) => API_LANG[lang] ?? "en";

const BASE = "https://fortnite-api.com";
const memo = new Map<string, Promise<unknown>>();

/** GET na fortnite-api com o idioma do app; se o endpoint não tiver esse idioma, cai no inglês. */
export function apiGet<T>(path: string, lang: string): Promise<T> {
  const al = apiLang(lang);
  const key = `${path}|${al}`;
  if (!memo.has(key)) {
    const url = (l: string) => `${BASE}${path}${path.includes("?") ? "&" : "?"}language=${l}`;
    const p = fetch(url(al))
      .then((r) => (r.status === 400 && al !== "en" ? fetch(url("en")) : r))
      .then(async (r) => {
        if (!r.ok) throw new Error(`fortnite-api ${r.status}`);
        return ((await r.json()) as { data: T }).data;
      });
    p.catch(() => memo.delete(key)); // falhou: deixa tentar de novo
    memo.set(key, p);
  }
  return memo.get(key) as Promise<T>;
}

export type Load<T> = { data?: T; error?: boolean; loading: boolean };

export function useApi<T>(path: string, lang: string): Load<T> & { retry: () => void } {
  const [state, setState] = useState<Load<T>>({ loading: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: false }));
    apiGet<T>(path, lang).then(
      (data) => alive && setState({ data, loading: false }),
      () => alive && setState({ error: true, loading: false }),
    );
    return () => {
      alive = false;
    };
  }, [path, lang, n]);
  return { ...state, retry: () => setN((x) => x + 1) };
}

export const iconUrl = (id: string, kind: "smallicon" | "icon" | "featured" = "smallicon") =>
  `${BASE}/images/cosmetics/br/${id.toLowerCase()}/${kind}.png`;

/* ---------- formatos usados nas páginas ---------- */

export interface ApiCosmetic {
  id: string;
  name: string;
  description?: string;
  type: { value: string; displayValue: string };
  rarity: { value: string; displayValue: string };
  series?: { value: string; image?: string; colors?: string[] } | null;
  set?: { value: string; text: string; backendValue: string } | null;
  introduction?: { chapter: string; season: string; text: string } | null;
  images: { smallIcon?: string; icon?: string; featured?: string };
  shopHistory?: string[] | null;
  added?: string;
}

export interface ApiTrack {
  id: string;
  devName: string;
  title: string;
  artist: string;
  album?: string;
  releaseYear?: number;
  bpm?: number;
  duration?: number;
  difficulty?: Record<string, number>;
  genres?: string[];
  albumArt: string;
  added?: string;
}

export interface ShopEntry {
  regularPrice: number;
  finalPrice: number;
  offerId: string;
  inDate: string;
  outDate: string;
  layout?: { id: string; name: string; index: number; rank: number } | null;
  tileSize?: string;
  colors?: { color1?: string; color2?: string; color3?: string } | null;
  bundle?: { name: string; info: string; image: string } | null;
  banner?: { value: string; intensity: string } | null;
  newDisplayAsset?: { renderImages?: { image: string }[] } | null;
  brItems?: ApiCosmetic[];
  tracks?: ApiTrack[];
  instruments?: { id: string; name: string; images: { large?: string; small?: string }; rarity: { value: string } }[];
  cars?: { id: string; name: string; images: { large?: string; small?: string }; rarity: { value: string } }[];
  legoKits?: { id: string; name: string; images: { large?: string; small?: string } }[];
}

export interface Shop {
  date: string;
  vbuckIcon: string;
  entries: ShopEntry[];
}

export interface NewsMotd {
  id: string;
  title: string;
  tabTitle?: string;
  body: string;
  image: string;
  tileImage?: string;
}

export interface MapData {
  images: { blank: string; pois: string };
  pois: { id: string; name: string; location: { x: number; y: number; z: number } }[];
}
