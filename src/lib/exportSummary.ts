import { imgUrl, RARITIES, type Rarity } from "./data";
import { BODY, DEFAULT_THEME, DISPLAY, RARITY_COLOR, RTL_CHARS, drawQr, loadImg, mix, toBlob, type AlbumImageOptions } from "./exportImage";

/*
 * Modelo "Resumo" da imagem da coleção: uma tela de story (1080×1920) com o essencial, para quem
 * vai postar. Progresso grande, uma barra por raridade, quantas dominadas, até 8 destaques e o QR code.
 */

export interface SummaryImageOptions extends AlbumImageOptions {
  rarityLabel: (r: Rarity) => string;
  highlightsTitle: string; // "Destaques"
}

/** Figurinha que a pessoa tem, em tamanho de destaque: fundo na cor da variante, brilho e ★ se dominada. */
function drawOwnedCell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, im: HTMLImageElement | null, st: number, rtl: boolean) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 18);
  const g = ctx.createLinearGradient(0, y, 0, y + size);
  g.addColorStop(0, mix(color, "#ffffff", 0.35));
  g.addColorStop(1, mix(color, "#1d1640", 0.35));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (im) ctx.drawImage(im, x + 8, y + 8, size - 16, size - 16);
  if (st === 2) {
    const f = ctx.createLinearGradient(x, y, x + size, y + size);
    ["rgba(255,157,226,0)", "rgba(255,157,226,.55)", "rgba(157,243,255,.55)", "rgba(255,245,157,.55)", "rgba(182,157,255,0)"].forEach((c, k, a) => f.addColorStop(k / (a.length - 1), c));
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = f;
    ctx.fillRect(x, y, size, size);
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.restore();
  ctx.strokeStyle = st === 2 ? "#f2b705" : "rgba(255,255,255,0.9)";
  ctx.lineWidth = st === 2 ? 4 : 3;
  ctx.beginPath();
  ctx.roundRect(x + 1.5, y + 1.5, size - 3, size - 3, 17);
  ctx.stroke();
  // Selo no canto: ✓ (tenho) ou ★ (dominado).
  const br = st === 2 ? 20 : 16;
  const bx = rtl ? x + br + 6 : x + size - br - 6;
  const by = y + br + 6;
  ctx.fillStyle = st === 2 ? "#f2b705" : "#ffffff";
  if (st === 2) {
    ctx.shadowColor = "rgba(242,183,5,0.85)";
    ctx.shadowBlur = 16;
  }
  ctx.beginPath();
  ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#1d1640";
  ctx.strokeStyle = "#1d1640";
  if (st === 2) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = "900 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("★", bx, by + 9.5);
  } else {
    ctx.lineWidth = 3.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx - 7, by);
    ctx.lineTo(bx - 2, by + 6);
    ctx.lineTo(bx + 8, by - 6);
    ctx.stroke();
  }
  ctx.restore();
}

export async function summaryPng(o: SummaryImageOptions): Promise<Blob> {
  const { season, collection } = o;
  const th = o.theme ?? DEFAULT_THEME;
  const rtl = o.dir === "rtl";
  await Promise.all([
    document.fonts.load(`900 40px ${DISPLAY}`),
    document.fonts.load(`800 20px ${DISPLAY}`),
    document.fonts.load(`600 16px ${BODY}`),
  ]).catch(() => {});

  const W = 1080;
  const H = 1920;
  const pad = 72;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.direction = o.dir;
  const X = (x: number, w = 0) => (rtl ? W - x - w : x);
  const align = (a: "left" | "right" | "center") => (rtl && a !== "center" ? (a === "left" ? "right" : "left") : a);
  const dirOf = (s: string): CanvasDirection => (rtl && RTL_CHARS.test(s) ? "rtl" : "ltr");
  const text = (s: string, x: number, y: number, font: string, color: string, a: "left" | "right" | "center" = "left") => {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align(a);
    ctx.direction = dirOf(s);
    ctx.fillText(s, X(x), y);
    ctx.direction = o.dir;
  };

  // Fundo, como na tabela completa.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, th.top);
  bg.addColorStop(0.35, th.mid);
  bg.addColorStop(1, th.bottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  for (let y = 16; y < H; y += 30) for (let x = 16; x < W; x += 30) ctx.fillRect(x, y, 3, 3);

  const owned = o.slots.filter((s) => (collection[s.id] ?? 0) > 0);
  const mastered = o.slots.filter((s) => collection[s.id] === 2).length;
  const total = o.slots.length;
  const pct = total ? Math.round((owned.length / total) * 100) : 0;

  // Marca e temporada.
  ctx.font = `900 72px ${DISPLAY}`;
  ctx.textAlign = "left";
  const lockerW = ctx.measureText("LOCKER").width;
  const dexW = ctx.measureText("DEX").width;
  const brandX = rtl ? W - pad - lockerW - dexW : pad;
  ctx.fillStyle = "#f1edff";
  ctx.fillText("LOCKER", brandX, 150);
  ctx.fillStyle = th.accent;
  ctx.fillText("DEX", brandX + lockerW, 150);
  text(o.brandTagline, pad, 192, `600 27px ${BODY}`, th.soft);
  text(o.title.toUpperCase(), pad, 300, `900 58px ${DISPLAY}`, "#f1edff");

  // Progresso grande: "39 / 145", porcentagem e barra.
  const big = String(owned.length);
  const rest = ` / ${total}`;
  ctx.direction = "ltr";
  ctx.font = `900 250px ${DISPLAY}`;
  const w1 = ctx.measureText(big).width;
  ctx.font = `900 110px ${DISPLAY}`;
  const w2 = ctx.measureText(rest).width;
  const x0 = (W - (w1 + w2)) / 2;
  ctx.textAlign = "left";
  ctx.font = `900 250px ${DISPLAY}`;
  ctx.fillStyle = th.accent;
  ctx.fillText(big, x0, 560);
  ctx.font = `900 110px ${DISPLAY}`;
  ctx.fillStyle = th.soft;
  ctx.fillText(rest, x0 + w1, 560);
  ctx.direction = o.dir;
  text(`${pct}%`, W / 2, 650, `900 64px ${DISPLAY}`, "#f1edff", "center");
  if (o.owner) text(o.owner, W / 2, 696, `700 30px ${BODY}`, th.soft, "center");

  const barY = 730;
  const barW = W - pad * 2;
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.roundRect(pad, barY, barW, 26, 13);
  ctx.fill();
  if (owned.length) {
    const fw = Math.max(26, (barW * owned.length) / total);
    const g = ctx.createLinearGradient(pad, 0, pad + barW, 0);
    g.addColorStop(0, rtl ? th.accent2 : th.accent);
    g.addColorStop(1, rtl ? th.accent : th.accent2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(X(pad, fw), barY, fw, 26, 13);
    ctx.fill();
  }

  // Uma barra por raridade.
  RARITIES.forEach((r, i) => {
    const part = o.slots.filter((s) => s.sprite.rarity === r);
    if (!part.length) return;
    const got = part.filter((s) => (collection[s.id] ?? 0) > 0).length;
    const y = 850 + i * 80;
    const rc = RARITY_COLOR[r] ?? "#9aa6c4";
    ctx.fillStyle = rc;
    ctx.beginPath();
    ctx.arc(X(pad + 11), y + 4, 11, 0, Math.PI * 2);
    ctx.fill();
    text(o.rarityLabel(r).toUpperCase(), pad + 34, y + 16, `800 36px ${DISPLAY}`, "#f1edff");
    text(`${got} / ${part.length}`, W - pad, y + 16, `800 36px ${DISPLAY}`, th.soft, "right");
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath();
    ctx.roundRect(pad, y + 30, barW, 14, 7);
    ctx.fill();
    if (got) {
      const fw = Math.max(14, (barW * got) / part.length);
      ctx.fillStyle = rc;
      ctx.beginPath();
      ctx.roundRect(X(pad, fw), y + 30, fw, 14, 7);
      ctx.fill();
    }
  });

  // Dominadas.
  const my = 1210;
  ctx.fillStyle = "#f2b705";
  ctx.shadowColor = "rgba(242,183,5,0.7)";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(X(pad + 24), my, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#1d1640";
  ctx.font = "900 32px sans-serif";
  ctx.textAlign = "center";
  ctx.direction = "ltr";
  ctx.fillText("★", X(pad + 24), my + 11);
  ctx.direction = o.dir;
  text(`${o.legend.mastered}: ${mastered}`, pad + 62, my + 13, `800 40px ${DISPLAY}`, "#f1edff");

  // Destaques: as dominadas primeiro, depois as de raridade mais alta.
  const order: Record<string, number> = Object.fromEntries(RARITIES.map((r, i) => [r, i]));
  const picks = [...owned]
    .sort((a, b) => (collection[b.id] ?? 0) - (collection[a.id] ?? 0) || order[a.sprite.rarity] - order[b.sprite.rarity] || a.no - b.no)
    .slice(0, 8);
  if (picks.length) {
    text(o.highlightsTitle.toUpperCase(), pad, 1290, `800 34px ${DISPLAY}`, th.soft);
    const colorOf = Object.fromEntries(season.variants.map((v) => [v.key, v.color]));
    const imgs = await Promise.all(picks.map((s) => loadImg(imgUrl(s.img))));
    const cell = 190;
    const gap = 18;
    const gx = (W - (4 * cell + 3 * gap)) / 2;
    picks.forEach((s, i) => {
      const cx = gx + (i % 4) * (cell + gap);
      const cy = 1316 + Math.floor(i / 4) * (cell + gap);
      drawOwnedCell(ctx, X(cx, cell), cy, cell, colorOf[s.variant] ?? "#9aa6c4", imgs[i], collection[s.id] ?? 1, rtl);
    });
  }

  // Rodapé: endereço e QR code.
  text(o.footer, pad, 1812, `800 34px ${DISPLAY}`, "#f1edff");
  if (o.url) drawQr(ctx, o.url, X(W - pad - 128, 128), 1730, 128);

  return toBlob(cv, o.format);
}
