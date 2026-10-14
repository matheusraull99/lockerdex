import { useEffect, useState } from "react";

/*
 * Jogos grátis da semana da Epic Games Store. O arquivo é gerado no build por data/build_free_games.py
 * (o feed da Epic não libera CORS). As datas decidem na hora o que está grátis agora e o que vem depois,
 * então um arquivo de ontem continua certo na virada de quinta.
 */
export interface FreeGame {
  id: string;
  slug: string | null;
  wide: string | null;
  tall: string | null;
  seller: string;
  start: string;
  end: string;
}

interface FreeData {
  updated: string;
  games: FreeGame[];
  text: Record<string, Record<string, [string, string, string]>>;
}

export interface FreeView extends FreeGame {
  title: string;
  desc: string;
  price: string;
  url: string;
}

let cache: Promise<FreeData> | null = null;

function load() {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/free-games.json`).then((r) => {
    if (!r.ok) throw new Error(`free-games ${r.status}`);
    return r.json() as Promise<FreeData>;
  });
  cache.catch(() => (cache = null)); // falhou: deixa tentar de novo
  return cache;
}

/** Página do jogo na loja oficial: lá a pessoa resgata com a conta dela (a loja escolhe o idioma). */
const storeUrl = (slug: string | null) => (slug ? `https://store.epicgames.com/p/${slug}` : "https://store.epicgames.com/free-games");

export function useFreeGames(lang: string) {
  const [data, setData] = useState<FreeData>();
  const [error, setError] = useState(false);
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(false);
    load().then(
      (d) => alive && setData(d),
      () => alive && setError(true),
    );
    return () => {
      alive = false;
    };
  }, [n]);

  const now = Date.now();
  const view = (g: FreeGame): FreeView => {
    const [title, desc, price] = data!.text[lang]?.[g.id] ?? data!.text.en?.[g.id] ?? ["", "", ""];
    return { ...g, title, desc, price, url: storeUrl(g.slug) };
  };
  const games = data?.games.filter((g) => Date.parse(g.end) > now).map(view) ?? [];
  return {
    loading: !data && !error,
    error,
    retry: () => setN((x) => x + 1),
    current: games.filter((g) => Date.parse(g.start) <= now),
    upcoming: games.filter((g) => Date.parse(g.start) > now),
  };
}
