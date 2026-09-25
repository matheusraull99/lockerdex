import { imgUrl, type Season, type Slot } from "./data";
import type { Collection } from "./collection";

const RARITY_COLOR: Record<string, string> = { rare: "#2e9bff", epic: "#a24dff", legendary: "#ff8a1f", mythic: "#f2b705" };

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * Desenha a página do álbum num PNG. Ícones só entram se o servidor das imagens
 * permitir uso em canvas (CORS); sem isso, a figurinha sai com número e cor.
 */
export async function albumPng(opts: {
  season: Season;
  slots: Slot[];
  collection: Collection;
  title: string;
  subtitle: string;
  owner: string;
}): Promise<Blob> {
  const { slots, collection } = opts;
  await document.fonts.ready;
  const cols = 12, cw = 88, ch = 110, gap = 12, pad = 48, top = 170;
  const rows = Math.ceil(slots.length / cols);
  const W = pad * 2 + cols * cw + (cols - 1) * gap;
  const H = top + rows * (ch + gap) + pad;
  const cv = document.createElement("canvas");
  const dpr = 2;
  cv.width = W * dpr;
  cv.height = H * dpr;
  const ctx = cv.getContext("2d")!;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "#eceff8";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#1d1640";
  ctx.font = "900 64px 'Big Shoulders Display', sans-serif";
  ctx.fillText("LOCKERDEX", pad, 96);
  const wordW = ctx.measureText("LOCKERDEX").width;
  ctx.fillStyle = "#ff3d8b";
  ctx.fillRect(pad, 108, wordW, 6);
  ctx.fillStyle = "#1d1640";
  ctx.font = "700 24px 'Figtree Variable', sans-serif";
  ctx.fillText(opts.title, pad + wordW + 28, 70);
  ctx.font = "500 20px 'Figtree Variable', sans-serif";
  ctx.fillStyle = "#5a5480";
  ctx.fillText(opts.subtitle + (opts.owner ? ` · ${opts.owner}` : ""), pad + wordW + 28, 100);

  const imgs = await Promise.all(slots.map((s) => ((collection[s.id] ?? 0) > 0 ? loadImg(imgUrl(s.img)) : Promise.resolve(null))));

  slots.forEach((s, i) => {
    const x = pad + (i % cols) * (cw + gap);
    const y = top + Math.floor(i / cols) * (ch + gap);
    const st = collection[s.id] ?? 0;
    ctx.save();
    if (st === 0) {
      rr(ctx, x, y, cw, ch, 10);
      ctx.fillStyle = "#e2e6f2";
      ctx.fill();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "#a9b0cb";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#a9b0cb";
      ctx.font = "900 34px 'Big Shoulders Display', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(s.no), x + cw / 2, y + ch / 2 + 12);
    } else {
      ctx.translate(x + cw / 2, y + ch / 2);
      ctx.rotate((s.tilt * Math.PI) / 180);
      ctx.translate(-cw / 2, -ch / 2);
      ctx.shadowColor = "rgba(29,22,64,.18)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;
      rr(ctx, 0, 0, cw, ch, 10);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.shadowColor = "transparent";
      rr(ctx, 5, 5, cw - 10, ch - 26, 7);
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, RARITY_COLOR[s.sprite.rarity]);
      g.addColorStop(1, "#1d1640");
      ctx.fillStyle = g;
      ctx.fill();
      const im = imgs[i];
      if (im) ctx.drawImage(im, 8, 8, cw - 16, cw - 16);
      if (st === 2) {
        const f = ctx.createLinearGradient(0, 0, cw, ch);
        ["#ff9de2", "#9df3ff", "#fff59d", "#b69dff"].forEach((c, k) => f.addColorStop(k / 3, c));
        ctx.globalAlpha = 0.35;
        rr(ctx, 5, 5, cw - 10, ch - 26, 7);
        ctx.fillStyle = f;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#f2b705";
        ctx.font = "900 20px sans-serif";
        ctx.fillText("★", cw - 24, 26);
      }
      ctx.fillStyle = "#1d1640";
      ctx.font = "900 17px 'Big Shoulders Display', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(s.no), cw / 2, ch - 6);
    }
    ctx.restore();
  });

  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png"));
}
