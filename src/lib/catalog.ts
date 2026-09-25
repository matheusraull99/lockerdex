import { useEffect, useState } from "react";
import { apiLang } from "./api";

/** Um cosmético do catálogo enxuto (public/data/cosmetics, gerado por data/build_cosmetics.py). */
export interface Item {
  id: string;
  name: string;
  type: string;
  rarity: string;
  set: string; // chave interna do conjunto
  intro: [string, string] | null; // capítulo, temporada
  lastShop: string; // AAAA-MM-DD ou ""
  shopCount: number;
  added: string;
}

export interface Catalog {
  updated: string;
  items: Item[];
  byId: Map<string, Item>;
  types: Record<string, string>;
  rarities: Record<string, string>;
  sets: Record<string, string>;
}

type Row = [string, string, string, string, number, string, number, string];
interface IndexFile {
  updated: string;
  seasons: Record<string, [string, string]>;
  items: Row[];
}
interface NamesFile {
  names: string[];
  types: Record<string, string>;
  rarities: Record<string, string>;
  sets: Record<string, string>;
}

const base = `${import.meta.env.BASE_URL}data/cosmetics/`;
let indexP: Promise<IndexFile> | null = null;
const cache = new Map<string, Promise<Catalog>>();

function load(lang: string): Promise<Catalog> {
  const al = apiLang(lang);
  if (!cache.has(al)) {
    indexP ??= fetch(`${base}index.json`).then((r) => r.json());
    const p = Promise.all([indexP, fetch(`${base}${al}.json`).then((r) => r.json() as Promise<NamesFile>)]).then(([idx, nm]) => {
      const items: Item[] = idx.items.map((r, i) => ({
        id: r[0],
        type: r[1],
        rarity: r[2],
        set: r[3],
        intro: r[4] ? (idx.seasons[String(r[4])] ?? null) : null,
        lastShop: r[5],
        shopCount: r[6],
        added: r[7],
        name: nm.names[i] || r[0],
      }));
      return { updated: idx.updated, items, byId: new Map(items.map((x) => [x.id.toLowerCase(), x])), types: nm.types, rarities: nm.rarities, sets: nm.sets };
    });
    p.catch(() => {
      cache.delete(al);
      indexP = null;
    });
    cache.set(al, p);
  }
  return cache.get(al)!;
}

export function useCatalog(lang: string) {
  const [state, setState] = useState<{ catalog?: Catalog; error?: boolean }>({});
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    load(lang).then(
      (catalog) => alive && setState({ catalog }),
      () => alive && setState({ error: true }),
    );
    return () => {
      alive = false;
    };
  }, [lang, n]);
  return { ...state, retry: () => setN((x) => x + 1) };
}

/** Cor de fundo por raridade/série, no padrão que o jogador conhece. */
export const RARITY_COLOR: Record<string, string> = {
  common: "#8f9aa8",
  uncommon: "#5cb82d",
  rare: "#2e9bff",
  epic: "#a24dff",
  legendary: "#ff8a1f",
  mythic: "#f2b705",
  exotic: "#35d5e6",
  transcendent: "#e0457b",
  icon: "#1fb5c9",
  marvel: "#d7263d",
  dc: "#2d6fd6",
  starwars: "#2b2b2b",
  gaminglegends: "#5b3df5",
  shadow: "#4a4a5a",
  slurp: "#0bc3d8",
  frozen: "#8fd3ff",
  lava: "#d9531e",
  dark: "#b0237e",
  platform: "#3c4b6b",
  lamborghini: "#b8a000",
};

export const rarityColor = (r: string) => RARITY_COLOR[r] ?? "#7a7f99";

export function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso + "T00:00:00Z").getTime()) / 86400000);
}
