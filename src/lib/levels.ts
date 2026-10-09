/** Nível (1 a 5) de cada figurinha que você tem, por id do fortnite.gg. Chave própria, fora da coleção e do link de compartilhar. */
export type LevelMap = Record<number, number>;

export const MAX_LEVEL = 5;
const KEY = "lockerdex:levels";

export function loadLevels(): LevelMap {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, unknown>;
    const out: LevelMap = {};
    for (const [k, v] of Object.entries(raw)) if (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= MAX_LEVEL) out[Number(k)] = v as number;
    return out;
  } catch {
    return {};
  }
}

export function saveLevels(l: LevelMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(l));
  } catch {
    /* navegação privada ou armazenamento cheio: segue só em memória */
  }
}
