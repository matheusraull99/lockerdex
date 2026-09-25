import { imgUrl, type Season, type Slot } from "./data";
import type { Collection } from "./collection";

/*
 * Imagem da coleção para compartilhar: uma tabela com um elemental por linha e uma variante
 * por coluna. Tenho = colorido com ✓; dominado = brilho + ★; falta = apagado com cadeado;
 * variante que não existe = tracejado. Em árabe (rtl) a tabela sai espelhada.
 */

const RARITY_COLOR: Record<string, string> = { rare: "#2e9bff", epic: "#a24dff", legendary: "#ff8a1f", mythic: "#f2b705" };
const DISPLAY = "'Big Shoulders Display', 'Arial Narrow', system-ui, sans-serif";
const BODY = "'Figtree Variable', system-ui, 'Noto Sans', sans-serif";
// Letras hebraicas e árabes (U+0590 a U+08FF), montadas por código para não depender de escape no arquivo.
const RTL_CHARS = new RegExp(`[${String.fromCharCode(0x590)}-${String.fromCharCode(0x8ff)}]`);

export interface AlbumImageOptions {
  season: Season;
  slots: Slot[]; // figurinhas visíveis (define quais elementais entram)
  collection: Collection;
  dir: "ltr" | "rtl";
  brandTagline: string;
  title: string; // "Capítulo 7 · Temporada 4"
  have: string; // "Tenho 57 de 96"
  legend: { owned: string; mastered: string; missing: string };
  owner: string;
  footer: string; // endereço do site
  spriteName: (key: string) => string;
  variantLabel: (key: string) => string;
  format?: "png" | "webp";
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function mix(hex: string, other: string, t: number) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(other.slice(1), 16);
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

export async function albumPng(o: AlbumImageOptions): Promise<Blob> {
  const { season, collection } = o;
  const rtl = o.dir === "rtl";
  await Promise.all([
    document.fonts.load(`900 40px ${DISPLAY}`),
    document.fonts.load(`800 20px ${DISPLAY}`),
    document.fonts.load(`600 16px ${BODY}`),
  ]).catch(() => {});

  const visible = new Set(o.slots.map((s) => s.id));
  const sprites = season.sprites.filter((sp) => sp.slots.some((s) => visible.has(s.id)));
  const variants = season.variants;

  // Medidas
  const pad = 44, cell = 92, gap = 12, nameW = 270, headH = 222, colH = 44, footH = 86;
  const gridW = variants.length * cell + (variants.length - 1) * gap;
  const W = Math.max(pad * 2 + nameW + gridW, 900);
  const rowH = cell + gap;
  const H = headH + colH + sprites.length * rowH + footH;
  const cv = document.createElement("canvas");
  const dpr = 2;
  cv.width = W * dpr;
  cv.height = H * dpr;
  const ctx = cv.getContext("2d")!;
  ctx.scale(dpr, dpr);
  // Espelha a posição horizontal em rtl (x e largura em coordenadas ltr).
  const X = (x: number, w = 0) => (rtl ? W - x - w : x);
  const align = (a: "left" | "right" | "center") => (rtl && a !== "center" ? (a === "left" ? "right" : "left") : a);
  ctx.direction = o.dir;

  // Fundo: roxo de tempestade, mais claro no alto.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#2a1e63");
  bg.addColorStop(0.35, "#1d1640");
  bg.addColorStop(1, "#110d24");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  for (let y = 12; y < H; y += 22) for (let x = 12; x < W; x += 22) ctx.fillRect(x, y, 2, 2);

  // Cabeçalho: marca, temporada, progresso.
  // Em rtl, trecho sem letra árabe/hebraica (números, nomes latinos) é desenhado ltr: senão "8-BIT" vira "BIT-8".
  const dirOf = (s: string): CanvasDirection => (rtl && RTL_CHARS.test(s) ? "rtl" : "ltr");
  const text = (s: string, x: number, y: number, font: string, color: string, a: "left" | "right" | "center" = "left") => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align(a);
    ctx.direction = dirOf(s);
    ctx.fillText(s, X(x), y);
    ctx.direction = o.dir;
  };
  ctx.font = `900 46px ${DISPLAY}`;
  const lockerW = ctx.measureText("LOCKER").width;
  const dexW = ctx.measureText("DEX").width;
  ctx.textAlign = "left";
  const brandX = rtl ? W - pad - lockerW - dexW : pad;
  ctx.fillStyle = "#f1edff";
  ctx.fillText("LOCKER", brandX, pad + 38);
  ctx.fillStyle = "#ff5c9f";
  ctx.fillText("DEX", brandX + lockerW, pad + 38);
  text(o.brandTagline, pad, pad + 62, `600 15px ${BODY}`, "#a8a0cf");

  text(o.title.toUpperCase(), pad, pad + 112, `900 34px ${DISPLAY}`, "#f1edff");
  const owned = o.slots.filter((s) => (collection[s.id] ?? 0) > 0).length;
  const mastered = o.slots.filter((s) => collection[s.id] === 2).length;
  const pct = o.slots.length ? Math.round((owned / o.slots.length) * 100) : 0;
  text(`${owned} / ${o.slots.length} · ${pct}%`, W - pad, pad + 112, `900 30px ${DISPLAY}`, "#ff5c9f", "right");
  text(o.have + (o.owner ? ` · ${o.owner}` : ""), pad, pad + 136, `600 15px ${BODY}`, "#a8a0cf");

  const barY = pad + 150, barW = W - pad * 2;
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.roundRect(pad, barY, barW, 10, 5);
  ctx.fill();
  if (owned) {
    const fw = Math.max(10, (barW * owned) / o.slots.length);
    const g = ctx.createLinearGradient(pad, 0, pad + barW, 0);
    g.addColorStop(0, rtl ? "#8b73ff" : "#ff5c9f");
    g.addColorStop(1, rtl ? "#ff5c9f" : "#8b73ff");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(X(pad, fw), barY, fw, 10, 5);
    ctx.fill();
  }

  // Cabeçalho das colunas: uma etiqueta por variante, na cor dela.
  const gridX = pad + nameW;
  const colY = headH;
  variants.forEach((v, i) => {
    const x = gridX + i * (cell + gap);
    ctx.fillStyle = v.color;
    ctx.beginPath();
    ctx.roundRect(X(x, cell), colY, cell, 30, 8);
    ctx.fill();
    ctx.font = `800 15px ${DISPLAY}`;
    const label = o.variantLabel(v.key).toUpperCase();
    let size = 15;
    while (ctx.measureText(label).width > cell - 10 && size > 9) ctx.font = `800 ${--size}px ${DISPLAY}`;
    ctx.fillStyle = luminance(v.color) > 0.45 ? "#1d1640" : "#ffffff";
    ctx.textAlign = "center";
    ctx.direction = dirOf(label);
    ctx.fillText(label, X(x, cell) + cell / 2, colY + 20);
    ctx.direction = o.dir;
  });

  const imgs = new Map<number, HTMLImageElement | null>();
  await Promise.all(sprites.flatMap((sp) => sp.slots.map(async (s) => imgs.set(s.id, await loadImg(imgUrl(s.img))))));
  const hasFilter = "filter" in ctx;

  // Linhas: pontinho da raridade + nome, e uma célula por variante.
  sprites.forEach((sp, r) => {
    const y = colY + colH + r * rowH;
    if (r > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fillRect(pad, y - gap / 2, W - pad * 2, 1);
    }
    const rc = RARITY_COLOR[sp.rarity] ?? "#9aa6c4";
    ctx.fillStyle = rc;
    ctx.beginPath();
    ctx.arc(X(pad + 6), y + cell / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `800 24px ${DISPLAY}`;
    const nm = o.spriteName(sp.key).toUpperCase();
    let size = 24;
    while (ctx.measureText(nm).width > nameW - 34 && size > 13) ctx.font = `800 ${--size}px ${DISPLAY}`;
    ctx.fillStyle = "#f1edff";
    ctx.textAlign = align("left");
    ctx.direction = dirOf(nm);
    ctx.fillText(nm, X(pad + 22), y + cell / 2 + 8);
    ctx.direction = o.dir;

    variants.forEach((v, i) => {
      const x = X(gridX + i * (cell + gap), cell);
      const slot = sp.slots.find((s) => s.variant === v.key);
      ctx.save();
      if (!slot) {
        // Essa variante não existe para este elemental.
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, cell - 2, cell - 2, 12);
        ctx.stroke();
        ctx.restore();
        return;
      }
      const st = collection[slot.id] ?? 0;
      const im = imgs.get(slot.id);
      ctx.beginPath();
      ctx.roundRect(x, y, cell, cell, 12);
      if (st > 0) {
        const g = ctx.createLinearGradient(0, y, 0, y + cell);
        g.addColorStop(0, mix(v.color, "#ffffff", 0.35));
        g.addColorStop(1, mix(v.color, "#1d1640", 0.35));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.save();
        ctx.clip();
        if (im) ctx.drawImage(im, x + 6, y + 6, cell - 12, cell - 12);
        if (st === 2) {
          const f = ctx.createLinearGradient(x, y, x + cell, y + cell);
          ["rgba(255,157,226,0)", "rgba(255,157,226,.55)", "rgba(157,243,255,.55)", "rgba(255,245,157,.55)", "rgba(182,157,255,0)"].forEach((c, k, a) => f.addColorStop(k / (a.length - 1), c));
          ctx.globalCompositeOperation = "overlay";
          ctx.fillStyle = f;
          ctx.fillRect(x, y, cell, cell);
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.restore();
        ctx.strokeStyle = st === 2 ? "#f2b705" : "rgba(255,255,255,0.9)";
        ctx.lineWidth = st === 2 ? 3 : 2;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, cell - 2, cell - 2, 11);
        ctx.stroke();
        // Selo: ✓ (tenho) ou ★ (dominado), no canto superior (do lado de fora da leitura em rtl).
        const bx = rtl ? x + 14 : x + cell - 14, by = y + 14;
        ctx.fillStyle = st === 2 ? "#f2b705" : "#ffffff";
        ctx.beginPath();
        ctx.arc(bx, by, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1d1640";
        ctx.strokeStyle = "#1d1640";
        if (st === 2) {
          ctx.font = `900 15px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("★", bx, by + 5);
        } else {
          ctx.lineWidth = 2.6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(bx - 5, by);
          ctx.lineTo(bx - 1.5, by + 4);
          ctx.lineTo(bx + 5.5, by - 4);
          ctx.stroke();
        }
      } else {
        // Falta: sombra do elemental e cadeado.
        ctx.fillStyle = "#231c4d";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (im) {
          ctx.save();
          ctx.globalAlpha = 0.22;
          if (hasFilter) ctx.filter = "grayscale(1) brightness(0.8)";
          ctx.drawImage(im, x + 10, y + 10, cell - 20, cell - 20);
          ctx.restore();
        }
        const lx = x + cell / 2, ly = y + cell / 2 + 4;
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(lx, ly - 8, 7, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(lx - 11, ly - 8, 22, 17, 4);
        ctx.fill();
      }
      // Número da figurinha no álbum (o mesmo do "marcar por número").
      ctx.font = `800 14px ${DISPLAY}`;
      ctx.textAlign = rtl ? "right" : "left";
      ctx.direction = "ltr";
      ctx.fillStyle = st > 0 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = st > 0 ? 3 : 0;
      ctx.fillText(String(slot.no), rtl ? x + cell - 8 : x + 8, y + cell - 8);
      ctx.restore();
    });
  });

  // Rodapé: legenda e endereço.
  const fy = H - footH + 44;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(pad, H - footH + 10, W - pad * 2, 1);
  const legend = `✓ ${o.legend.owned}: ${owned}   ★ ${o.legend.mastered}: ${mastered}   🔒 ${o.legend.missing}: ${o.slots.length - owned}`;
  text(legend, pad, fy, `600 15px ${BODY}`, "#a8a0cf");
  text(o.footer, W - pad, fy, `800 17px ${DISPLAY}`, "#f1edff", "right");

  // WebP sai bem menor; navegador que não gera WebP devolve PNG (quem chama olha blob.type).
  const type = o.format === "webp" ? "image/webp" : "image/png";
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), type, 0.92));
}
