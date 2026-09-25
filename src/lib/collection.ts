import { MAX_ID, type Status } from "./data";

/** Coleção: status por id de figurinha. Ausente = falta. */
export type Collection = Record<number, Status>;

// Nome de antes da troca para Lockerdex: mantido para não perder coleções já salvas.
const KEY = "spritedex:v1";

interface Saved {
  code: string;
  name?: string;
  lang?: string;
  prefs?: Record<string, unknown>;
}

function readSaved(): Saved {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") as Saved;
  } catch {
    return { code: "" };
  }
}

function writeSaved(patch: Partial<Saved>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readSaved(), ...patch }));
  } catch {
    /* navegação privada ou armazenamento cheio: segue só em memória */
  }
}

export const storage = {
  load: () => decode(readSaved().code || "") ?? {},
  save: (c: Collection) => writeSaved({ code: encode(c) }),
  name: () => readSaved().name ?? "",
  setName: (name: string) => writeSaved({ name }),
  lang: () => readSaved().lang,
  setLang: (lang: string) => writeSaved({ lang }),
  prefs: () => readSaved().prefs ?? {},
  setPrefs: (prefs: Record<string, unknown>) => writeSaved({ prefs }),
};

/*
 * Código da coleção: 2 bits por figurinha, indexado pelo id (o id do fortnite.gg,
 * que não muda). Assim um link antigo continua valendo quando entram sprites novos.
 * Formato: "1" + base64url(bitset).
 */
export function encode(c: Collection): string {
  const bytes = new Uint8Array(Math.ceil((MAX_ID + 1) / 4));
  let last = -1;
  for (const [k, v] of Object.entries(c)) {
    const id = Number(k);
    if (!v || id > MAX_ID) continue;
    bytes[id >> 2] |= v << ((id & 3) * 2);
    last = Math.max(last, id >> 2);
  }
  if (last < 0) return "";
  let bin = "";
  for (let i = 0; i <= last; i++) bin += String.fromCharCode(bytes[i]);
  return "1" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decode(code: string): Collection | null {
  code = code.trim();
  if (code === "") return {};
  if (code[0] !== "1") return null;
  try {
    const bin = atob(code.slice(1).replace(/-/g, "+").replace(/_/g, "/"));
    const c: Collection = {};
    for (let i = 0; i < bin.length; i++) {
      const b = bin.charCodeAt(i);
      for (let j = 0; j < 4; j++) {
        const v = ((b >> (j * 2)) & 3) as Status;
        if (v === 1 || v === 2) c[i * 4 + j] = v;
      }
    }
    return c;
  } catch {
    return null;
  }
}

/** Link compartilhável: #c=<código>&n=<nome>&s=<temporada> */
export function shareUrl(c: Collection, name: string, season: number) {
  const p = new URLSearchParams({ c: encode(c) || "1", s: String(season) });
  if (name.trim()) p.set("n", name.trim().slice(0, 32));
  return `${location.origin}${location.pathname}#${p.toString()}`;
}

export function readShared(): { collection: Collection; name: string; season?: number } | null {
  const h = location.hash.slice(1);
  if (!h) return null;
  const p = new URLSearchParams(h);
  const code = p.get("c");
  if (code === null) return null;
  const collection = decode(code);
  if (!collection) return null;
  const s = Number(p.get("s"));
  return { collection, name: (p.get("n") ?? "").slice(0, 32), season: Number.isFinite(s) && s ? s : undefined };
}

/** Aceita um código puro ou um link do Lockerdex. */
export function parseBackup(text: string): Collection | null {
  const t = text.trim();
  const i = t.indexOf("#");
  if (i >= 0) {
    const code = new URLSearchParams(t.slice(i + 1)).get("c");
    return code === null ? null : decode(code);
  }
  return t ? decode(t) : null;
}

/** "3 7 12-15" -> [3, 7, 12, 13, 14, 15] */
export function parseNumbers(text: string, max: number): number[] {
  const out = new Set<number>();
  for (const part of text.split(/[\s,;]+/)) {
    const m = part.match(/^#?(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let n = Math.min(a, b); n <= Math.max(a, b) && n <= max; n++) if (n >= 1) out.add(n);
  }
  return [...out].sort((x, y) => x - y);
}
