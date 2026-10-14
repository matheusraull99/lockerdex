import { useCallback, useEffect, useState } from "react";
import type { Load } from "./api";

/*
 * Fortnite Data API, da própria Epic: pública, sem chave e com CORS liberado.
 * Doc: https://api.fortnite.com/ecosystem/v1/docs/
 * Só tem ilhas públicas e descobríveis. O histórico vai até 7 dias, e ilha com menos de
 * 5 jogadores no intervalo vem com null. Os números são por hora, então a meia hora de memória basta.
 */
const BASE = "https://api.fortnite.com/ecosystem/v1";
const MAX_AGE = 10 * 60 * 1000;
const memo = new Map<string, { p: Promise<unknown>; at: number }>();

/** Erro com o status da resposta, para a página separar "não existe" (404) de "sem rede". */
export class EcoError extends Error {
  constructor(public status: number) {
    super(`fortnite data api ${status}`);
  }
}

/*
 * O ranking pede ~20 ilhas de uma vez. Rajada assim leva 429 do Cloudflare da Epic, que volta sem CORS
 * (no navegador vira ERR_FAILED). Por isso: no máximo 4 pedidos ao mesmo tempo e uma nova tentativa.
 */
const PARALLEL = 4;
let active = 0;
const waiting: (() => void)[] = [];
const slot = () => new Promise<void>((ok) => (active < PARALLEL ? (active++, ok()) : waiting.push(() => (active++, ok()))));
const release = () => (active--, waiting.shift()?.());
const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

async function fetchJson<T>(path: string): Promise<T> {
  for (let tries = 0; ; tries++) {
    await slot();
    let r: Response | null = null;
    try {
      r = await fetch(BASE + path, { signal: AbortSignal.timeout(20000) });
    } catch (e) {
      if (tries >= 1) throw e; // sem rede de verdade: desiste na segunda
    } finally {
      release();
    }
    if (r?.ok) return (await r.json()) as T;
    if (r && r.status !== 429 && r.status < 500) throw new EcoError(r.status); // 404 e 400 não mudam tentando de novo
    if (tries >= 1) throw new EcoError(r?.status ?? 0);
    await sleep(1200);
  }
}

export function ecoGet<T>(path: string): Promise<T> {
  const hit = memo.get(path);
  if (hit && Date.now() - hit.at < MAX_AGE) return hit.p as Promise<T>;
  const p = fetchJson<T>(path);
  p.catch(() => memo.get(path)?.p === p && memo.delete(path)); // falhou: deixa tentar de novo
  memo.set(path, { p, at: Date.now() });
  return p;
}

export type EcoLoad<T> = Load<T> & { status?: number; retry: () => void };

/** Igual ao useApi, mas na API da Epic. path null = não buscar nada. */
export function useEco<T>(path: string | null): EcoLoad<T> {
  const [state, setState] = useState<Load<T> & { status?: number }>({ loading: !!path });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: false }));
    ecoGet<T>(path).then(
      (data) => alive && setState({ data, loading: false }),
      (e) => alive && setState({ error: true, loading: false, status: e instanceof EcoError ? e.status : 0 }),
    );
    return () => {
      alive = false;
    };
  }, [path, n]);
  const retry = useCallback(() => setN((x) => x + 1), []);
  return { ...state, retry };
}

/* ---------- formatos ---------- */

export interface Island {
  code: string;
  displayName?: string; // modos da Epic ("battle-royale"), que respondem pelo nome e não pelo código
  creatorCode: string;
  title: string;
  category?: string;
  createdIn?: string;
  tags?: string[];
}

export interface Point {
  value: number | null;
  timestamp: string;
}

export interface IslandMetrics {
  uniquePlayers: Point[];
  plays: Point[];
  peakCCU: Point[];
  averageMinutesPerPlayer: Point[];
  minutesPlayed: Point[];
  favorites: Point[];
  recommendations: Point[];
  retention: { d1: number | null; d7: number | null; timestamp: string }[];
}

export interface Genre {
  slug: string;
  displayName: string;
}

export interface GenreRanking {
  meta: { total: number; snapshot: string };
  data: { islandCode: string; rank: number }[];
}

export interface IslandRankings {
  data: { timestamp: string; genres: { genreSlug: string; genre: string; rank: number }[] }[];
}

/* ---------- ajudas ---------- */

/** "232540553398", "2325 4055 3398" → "2325-4055-3398". Nome de modo da Epic passa como está. */
export function normalizeCode(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  const digits = s.replace(/\D/g, "");
  if (/^[\d\s-]+$/.test(s)) return digits.length === 12 ? digits.replace(/(\d{4})(\d{4})(\d{4})/, "$1-$2-$3") : null;
  return /^[a-z0-9][a-z0-9_-]{1,60}$/.test(s) ? s : null;
}

/** Último valor que veio (as horas mais recentes chegam com null até fechar). */
export function lastValue(points?: Point[]): number | null {
  for (let i = (points?.length ?? 0) - 1; i >= 0; i--) if (points![i].value != null) return points![i].value;
  return null;
}

/** Meia-noite UTC de hoje, menos n dias, no formato que a API aceita. */
export function utcDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

/** Página oficial da ilha no fortnite.com (é para lá que o código redireciona). */
export const officialUrl = (i: Island) => `https://www.fortnite.com/@${i.creatorCode}/${i.displayName ?? i.code}`;
