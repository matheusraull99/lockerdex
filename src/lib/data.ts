import raw from "../data/seasons.json";

export type Rarity = "rare" | "epic" | "legendary" | "mythic";
export type Status = 0 | 1 | 2; // falta, tenho, dominado

export interface Levels {
  unit?: string;
  units?: string[];
  plus?: boolean;
  values: (number | number[])[];
}

export interface RawSlot {
  variant: string;
  fggId: number;
  img: string;
  cost: number;
  drop: number;
}

export interface Sprite {
  key: string;
  rarity: Rarity;
  levels: Levels | null;
  location: string;
  unreleased: boolean;
  isNew: boolean;
  slots: Slot[];
}

/** Uma figurinha do álbum: um sprite numa variante. */
export interface Slot extends RawSlot {
  id: number; // = fggId, estável entre versões dos dados
  no: number; // número no álbum da temporada
  sprite: Sprite;
  tilt: number; // inclinação da figurinha colada, em graus
}

export interface Season {
  id: number;
  code: string;
  chapter: number;
  season: number;
  current: boolean;
  costSource: "community" | "game";
  variants: { key: string; color: string }[];
  sprites: Sprite[];
  slots: Slot[]; // em ordem do álbum
}

export const RARITIES: Rarity[] = ["mythic", "legendary", "epic", "rare"];

function tiltFor(id: number) {
  // pseudoaleatório estável: cada figurinha tem sempre a mesma inclinação
  const x = Math.sin(id * 12.9898) * 43758.5453;
  return Math.round(((x - Math.floor(x)) * 3 - 1.5) * 10) / 10;
}

type RawSeason = Omit<Season, "slots" | "sprites"> & {
  sprites: (Omit<Sprite, "slots"> & { slots: RawSlot[] })[];
};

export const SEASONS: Season[] = (raw as RawSeason[]).map((rs) => {
  const sprites: Sprite[] = [];
  const released: Slot[] = [];
  const later: Slot[] = [];
  for (const r of rs.sprites) {
    const sprite: Sprite = { ...r, slots: [] };
    for (const s of r.slots) {
      const slot: Slot = { ...s, id: s.fggId, no: 0, sprite, tilt: tiltFor(s.fggId) };
      sprite.slots.push(slot);
      (sprite.unreleased ? later : released).push(slot);
    }
    sprites.push(sprite);
  }
  // Os lançados ganham os primeiros números; os que ainda não saíram vêm no fim.
  const slots = [...released, ...later];
  slots.forEach((s, i) => (s.no = i + 1));
  return { ...rs, sprites, slots };
});

export const ALL_SLOTS: Slot[] = SEASONS.flatMap((s) => s.slots);
export const MAX_ID = Math.max(...ALL_SLOTS.map((s) => s.id));

const IMG_BASE: string = import.meta.env.VITE_IMG_BASE ?? "https://fortnite.gg";

/** URL da imagem. Com VITE_IMG_BASE=local, usa os ícones copiados para public/icons. */
export function imgUrl(path: string) {
  if (IMG_BASE === "local") return `${import.meta.env.BASE_URL}icons/${path.split("/").pop()}`;
  return IMG_BASE + path;
}

/** Imagem que não carregou fica invisível em vez de mostrar o ícone de quebrada. */
export function hideBroken(e: { currentTarget: HTMLImageElement }) {
  e.currentTarget.dataset.broken = "";
}
