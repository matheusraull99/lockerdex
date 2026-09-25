import { useCallback, useEffect, useState } from "react";

/** Lista de desejos e armário: ids de cosméticos, salvos no aparelho. */
export interface Lists {
  wish: string[];
  own: string[];
}

// Nome de antes da troca para Lockerdex: mantido para não perder listas já salvas.
const KEY = "spritedex:lists";
const subs = new Set<(l: Lists) => void>();

function read(): Lists {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { wish: Array.isArray(v.wish) ? v.wish : [], own: Array.isArray(v.own) ? v.own : [] };
  } catch {
    return { wish: [], own: [] };
  }
}

let current = read();

function write(next: Lists) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sem armazenamento: segue em memória */
  }
  subs.forEach((f) => f(next));
}

export function useLists() {
  const [lists, setLists] = useState(current);
  useEffect(() => {
    subs.add(setLists);
    return () => {
      subs.delete(setLists);
    };
  }, []);
  const toggle = useCallback((which: keyof Lists, id: string) => {
    const has = current[which].includes(id);
    write({ ...current, [which]: has ? current[which].filter((x) => x !== id) : [id, ...current[which]] });
  }, []);
  const clear = useCallback((which: keyof Lists) => write({ ...current, [which]: [] }), []);
  const replace = useCallback((l: Lists) => write(l), []);
  return { lists, toggle, clear, replace, wish: new Set(lists.wish), own: new Set(lists.own) };
}

/*
 * Link das listas: cada id vira 5 bytes (hash FNV-1a de 32 bits + 8 bits de um segundo hash),
 * em base64url. Quem abre o link recalcula o hash de todos os ids do catálogo para achar os itens.
 */
function fnv(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function idHash(id: string) {
  const a = fnv(id.toLowerCase());
  const b = fnv(id.toLowerCase() + "#") & 0xff;
  return a.toString(16).padStart(8, "0") + b.toString(16).padStart(2, "0");
}

function b64(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function encodeIds(ids: string[]) {
  const out = new Uint8Array(ids.length * 5);
  ids.forEach((id, i) => {
    const h = idHash(id);
    for (let j = 0; j < 5; j++) out[i * 5 + j] = parseInt(h.slice(j * 2, j * 2 + 2), 16);
  });
  return b64(out);
}

export function decodeHashes(code: string): string[] {
  try {
    const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const out: string[] = [];
    for (let i = 0; i + 5 <= bin.length; i += 5) {
      let h = "";
      for (let j = 0; j < 5; j++) h += bin.charCodeAt(i + j).toString(16).padStart(2, "0");
      out.push(h);
    }
    return out;
  } catch {
    return [];
  }
}
