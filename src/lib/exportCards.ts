import { imgUrl, RARITIES, type Rarity, type Season, type Slot } from "./data";
import type { Collection } from "./collection";
import { BODY, DEFAULT_THEME, DISPLAY, RARITY_COLOR, drawQr, loadImg, mix, toBlob, type ImageTheme } from "./exportImage";

/*
 * Cinco modelos de story (1080×1920) para compartilhar a coleção, misturando o print do fortnite.gg (ícones grandes,
 * selo verde/amarelo/listrado embaixo, placar no topo, fundo de cenário) com a cara de álbum do Lockerdex
 * (figurinha colada com a moldura da variante, número, silhueta do que falta, boneco e QR). Tudo se ajusta ao
 * tamanho da temporada: 35 figurinhas cabem grandes; 162 encolhem para caber na tela.
 */

export type CardKind = "card" | "showcase" | "help" | "page" | "duel";

export interface CardTexts {
  seasonShort: string; // "C7 Mini"
  seasonTitle: string; // "Capítulo 7 · Minitemporada"
  owned: string; // "Tenho"
  mastered: string; // "Dominado"
  ofAlbum: string; // "do álbum"
  showcase: string; // "Minha vitrine"
  helpTitle: string; // "Me ajuda a fechar!"
  helpSub: string; // "Faltam 18 figurinhas no meu álbum da C7 Mini"
  closest: string | null; // "Mais perto de fechar: Baunardo (2/3)"
  complete: string; // "Álbum completo!"
  pageSub: string; // "17 de 35 coladas · 4 dominadas"
  duelTitle: string; // "Duelo de álbum"
  me: string; // "Eu"
  friend: string; // nome do amigo
  onlyMe: string; // "Só eu tenho"
  onlyFriend: string; // "Só Ana tem"
  both: string; // "Nós dois temos"
  tagline: string; // "Monte o seu álbum de elementais"
}

export interface CardOptions {
  kind: CardKind;
  season: Season;
  slots: Slot[]; // figurinhas visíveis
  collection: Collection;
  friend?: Collection; // só no duelo
  dir: "ltr" | "rtl";
  texts: CardTexts;
  spriteName: (key: string) => string;
  variantLabel: (key: string) => string;
  rarityLabel: (r: Rarity) => string;
  avatar: string; // imagem do boneco
  url: string; // QR
  footer: string; // endereço escrito
  theme?: ImageTheme;
  format?: "png" | "webp";
}

const W = 1080, H = 1920, PAD = 54;
const INK = "#1d1640", WHITE = "#f1edff";
const GREEN = "#3ec94f", GOLD = "#f7ce1e";
type Ctx = CanvasRenderingContext2D;

const st = (c: Collection | undefined, s: Slot) => (c?.[s.id] ?? 0);

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Texto numa largura máxima, diminuindo a fonte até caber. */
function fitText(ctx: Ctx, s: string, x: number, y: number, max: number, weight: string, size: number, family: string, color: string, align: CanvasTextAlign = "left", min = 12) {
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(s).width > max && size > min) ctx.font = `${weight} ${--size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
}

/** Selo embaixo da figurinha, como no fortnite.gg: verde (tenho), amarelo (dominado), listrado (falta). */
function badge(ctx: Ctx, cx: number, cy: number, r: number, s: number) {
  ctx.save();
  if (!s) {
    rr(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.4);
    ctx.fillStyle = "#3c3854";
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = "#605c7c";
    ctx.lineWidth = Math.max(2, r / 6);
    for (let i = -2 * r; i < 4 * r; i += r / 2) {
      ctx.beginPath();
      ctx.moveTo(cx - r + i, cy + r);
      ctx.lineTo(cx - r + i + 2 * r, cy - r);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  const col = s === 2 ? GOLD : GREEN;
  rr(ctx, cx - r, cy - r, r * 2, r * 2, r * 0.4);
  ctx.fillStyle = "#12121a";
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(2, r / 3.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.moveTo(cx - r * 0.45, cy + r * 0.02);
  ctx.lineTo(cx - r * 0.1, cy + r * 0.38);
  ctx.lineTo(cx + r * 0.48, cy - r * 0.38);
  ctx.stroke();
  ctx.restore();
}

/**
 * Figurinha do Lockerdex. Colada: moldura branca, fundo na cor da raridade, borda na cor da variante, brilho se dominada.
 * Faltando: fundo do álbum, contorno pontilhado, silhueta e o número.
 */
function sticker(ctx: Ctx, o: CardOptions, slot: Slot, s: number, im: HTMLImageElement | null, x: number, y: number, w: number, h: number, light = false) {
  const r = Math.max(8, w / 9);
  const vc = o.season.variants.find((v) => v.key === slot.variant)?.color ?? "#9aa6c4";
  const rc = RARITY_COLOR[slot.sprite.rarity] ?? "#9aa6c4";
  ctx.save();
  if (s) {
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = w / 10;
    ctx.shadowOffsetY = w / 22;
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.shadowColor = "transparent";
    const b = Math.max(4, w / 22), ih = h - 2 * b - h / 7;
    rr(ctx, x + b, y + b, w - 2 * b, ih, r - 3);
    const g = ctx.createLinearGradient(x, y, x + w, y + ih);
    g.addColorStop(0, mix(rc, "#ffffff", 0.45));
    g.addColorStop(1, mix(rc, INK, 0.35));
    ctx.fillStyle = g;
    ctx.fill();
    if (im) {
      const sz = Math.min(w - 2 * b, ih) * 0.98;
      ctx.drawImage(im, x + (w - sz) / 2, y + b + (ih - sz) / 2, sz, sz);
    }
    if (s === 2) {
      ctx.save();
      rr(ctx, x, y, w, h, r);
      ctx.clip();
      const f = ctx.createLinearGradient(x, y, x + w, y + h);
      ["rgba(255,157,226,0)", "rgba(255,157,226,.35)", "rgba(157,243,255,.35)", "rgba(255,245,157,.35)", "rgba(182,157,255,0)"].forEach((c, k, a) => f.addColorStop(k / (a.length - 1), c));
      ctx.fillStyle = f;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, r);
    ctx.strokeStyle = vc;
    ctx.lineWidth = Math.max(3, w / 30);
    ctx.stroke();
    ctx.font = `900 ${Math.max(12, Math.round(w / 7))}px ${DISPLAY}`;
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.fillText(String(slot.no), x + w / 2, y + h - h / 28);
  } else {
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = light ? "#e2e6f2" : "rgba(33,27,69,0.92)";
    ctx.fill();
    if (im) {
      ctx.globalAlpha = light ? 0.14 : 0.13;
      if ("filter" in ctx) ctx.filter = light ? "brightness(0)" : "brightness(0) invert(1)";
      const sz = w * 0.84;
      ctx.drawImage(im, x + (w - sz) / 2, y + (h - sz) / 2 - h / 16, sz, sz);
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    }
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = light ? "#a9b0cb" : "#4b4380";
    ctx.lineWidth = 2.5;
    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, r);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `900 ${Math.max(12, Math.round(w / 5.5))}px ${DISPLAY}`;
    ctx.fillStyle = light ? "#7872a0" : "#827ca8";
    ctx.textAlign = "left";
    ctx.fillText(String(slot.no), x + w / 10, y + w / 10 + w / 6);
  }
  ctx.restore();
}

function brand(ctx: Ctx, x: number, y: number, size: number, accent: string, dark = true) {
  ctx.font = `900 ${size}px ${DISPLAY}`;
  ctx.textAlign = "left";
  ctx.fillStyle = dark ? WHITE : INK;
  ctx.fillText("LOCKER", x, y);
  const w = ctx.measureText("LOCKER").width;
  ctx.fillStyle = accent;
  ctx.fillText("DEX", x + w, y);
}

function avatar(ctx: Ctx, im: HTMLImageElement | null, x: number, y: number, size: number, accent: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 + 4, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#2a1f5c";
  ctx.fill();
  ctx.clip();
  if (im) ctx.drawImage(im, x, y, size, size);
  ctx.restore();
}

/** Rodapé com a marca, a frase e o QR do Lockerdex. */
function footer(ctx: Ctx, o: CardOptions, th: ImageTheme, y: number, h: number, dark = true) {
  ctx.save();
  rr(ctx, PAD - 6, y, W - 2 * (PAD - 6), h, 28);
  ctx.fillStyle = dark ? "rgba(255,255,255,0.94)" : INK;
  ctx.fill();
  const ink = dark ? INK : WHITE;
  brand(ctx, PAD + 30, y + h / 2 - 10, 52, th.accent, !dark);
  fitText(ctx, o.texts.tagline, PAD + 32, y + h / 2 + 30, W - 2 * PAD - h - 60, "700", 28, BODY, ink);
  fitText(ctx, o.footer, PAD + 32, y + h / 2 + 62, W - 2 * PAD - h - 60, "500", 23, BODY, dark ? "#5a5480" : "#a8a0cf");
  const qs = h - 36;
  drawQr(ctx, o.url, W - PAD - 12 - qs, y + 18, qs);
  ctx.restore();
}

/** Fundo de cenário: os próprios elementais espalhados e borrados sobre o roxo do tema. */
function sceneBg(ctx: Ctx, th: ImageTheme, imgs: (HTMLImageElement | null)[]) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, th.top);
  g.addColorStop(1, th.bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const pool = imgs.filter(Boolean) as HTMLImageElement[];
  if (!pool.length) return;
  ctx.save();
  const canBlur = "filter" in ctx;
  if (canBlur) ctx.filter = "blur(26px)";
  ctx.globalAlpha = canBlur ? 0.45 : 0.12;
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 24; i++) {
    const im = pool[Math.floor(rnd() * pool.length)];
    const s = 220 + rnd() * 200;
    ctx.drawImage(im, -150 + rnd() * (W + 50), -150 + rnd() * (H + 50), s, s);
  }
  ctx.restore();
  ctx.fillStyle = "rgba(12,8,28,0.45)";
  ctx.fillRect(0, 0, W, H);
}

/** Maior figurinha que cabe: n figurinhas numa área w×h, com a altura da figurinha = 1,25 × largura + um extra embaixo. */
function fitGrid(n: number, w: number, h: number, extra: number, gapX = 18, maxW = 220) {
  let best = { cols: 1, cw: 0 };
  for (let cols = 2; cols <= 14; cols++) {
    const cw = Math.min(maxW, (w - (cols - 1) * gapX) / cols);
    const rows = Math.ceil(n / cols);
    const need = rows * (cw * 1.25 + extra * (cw / 120));
    if (need <= h && cw > best.cw) best = { cols, cw };
  }
  if (!best.cw) best = { cols: 14, cw: (w - 13 * gapX) / 14 };
  const ch = best.cw * 1.25;
  return { ...best, ch, gap: (w - best.cols * best.cw) / Math.max(1, best.cols - 1), rowH: ch + extra * (best.cw / 120) };
}

function header(ctx: Ctx, th: ImageTheme, av: HTMLImageElement | null, sub: string) {
  avatar(ctx, av, PAD, 66, 112, th.accent);
  brand(ctx, PAD + 140, 130, 62, th.accent);
  fitText(ctx, sub.toUpperCase(), PAD + 142, 172, W - PAD * 2 - 150, "700", 25, BODY, "#dcd6f6");
}

/** Placar em vidro: número grande, "/ total" e o rótulo embaixo. */
function score(ctx: Ctx, x: number, y: number, w: number, num: number, tot: number, label: string, color: string) {
  rr(ctx, x, y, w, 120, 22);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = `900 72px ${DISPLAY}`;
  ctx.textAlign = "left";
  ctx.fillStyle = color;
  ctx.fillText(String(num), x + 22, y + 74);
  const nw = ctx.measureText(String(num)).width;
  ctx.font = `800 38px ${DISPLAY}`;
  ctx.fillStyle = "#c8c2e6";
  ctx.fillText(`/ ${tot}`, x + 30 + nw, y + 74);
  fitText(ctx, label.toUpperCase(), x + 24, y + 104, w - 40, "700", 22, BODY, "#dcd6f6");
}

export async function cardPng(o: CardOptions): Promise<Blob> {
  const th = o.theme ?? DEFAULT_THEME;
  await Promise.all([document.fonts.load(`900 40px ${DISPLAY}`), document.fonts.load(`800 20px ${DISPLAY}`), document.fonts.load(`700 16px ${BODY}`)]).catch(() => {});
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.direction = o.dir;
  ctx.textBaseline = "alphabetic";

  const slots = o.slots;
  const imgs = new Map<number, HTMLImageElement | null>();
  const [av] = await Promise.all([loadImg(o.avatar), ...slots.map(async (s) => imgs.set(s.id, await loadImg(imgUrl(s.img))))]);
  const owned = slots.filter((s) => st(o.collection, s)).length;
  const mastered = slots.filter((s) => st(o.collection, s) === 2).length;
  const T = o.texts;

  if (o.kind === "card") {
    sceneBg(ctx, th, [...imgs.values()]);
    header(ctx, th, av, T.seasonTitle);
    score(ctx, PAD, 236, 300, owned, slots.length, T.owned, "#62de6e");
    score(ctx, PAD + 320, 236, 300, mastered, slots.length, T.mastered, "#fad63c");
    rr(ctx, PAD + 640, 236, W - PAD * 2 - 640, 120, 22);
    ctx.fillStyle = th.accent;
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 76px ${DISPLAY}`;
    const cx = PAD + 640 + (W - PAD * 2 - 640) / 2;
    ctx.fillText(`${slots.length ? Math.round((owned / slots.length) * 100) : 0}%`, cx, 316);
    fitText(ctx, T.ofAlbum.toUpperCase(), cx, 344, W - PAD * 2 - 670, "700", 22, BODY, "#ffe9f3", "center");
    const top = 400, bottom = H - 250;
    const g = fitGrid(slots.length, W - PAD * 2, bottom - top, 60);
    slots.forEach((s, i) => {
      const r = Math.floor(i / g.cols), c = i % g.cols;
      const x = PAD + c * (g.cw + g.gap), y = top + r * g.rowH;
      const v = st(o.collection, s);
      sticker(ctx, o, s, v, imgs.get(s.id) ?? null, x, y, g.cw, g.ch);
      badge(ctx, x + g.cw / 2, y + g.ch + (g.rowH - g.ch) / 2, Math.max(9, g.cw / 7), v);
    });
    footer(ctx, o, th, H - 220, 170);
  } else if (o.kind === "showcase") {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, th.top);
    bg.addColorStop(1, th.bottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    header(ctx, th, av, `${T.showcase} · ${T.seasonShort} · ${owned}/${slots.length}`);
    const groups = RARITIES.map((r) => ({ r, items: slots.filter((s) => s.sprite.rarity === r) })).filter((x) => x.items.length);
    const top = 210, bottom = H - 210;
    // Escala única: os míticos com figurinha maior; as outras raridades com a mesma figurinha menor. Encolhe até caber.
    let small = 140;
    const plan = (sw: number) => {
      let y = top;
      return groups.map((gr) => {
        const big = gr.r === "mythic";
        const cw = big ? Math.min(200, sw * 1.45) : sw;
        const cols = Math.max(1, Math.floor((W - PAD * 2 + 16) / (cw + 16)));
        const rows = Math.ceil(gr.items.length / cols);
        const rowH = cw * 1.25 + cw / 3.6;
        const block = { ...gr, y, cw, cols, rowH };
        y += 70 + rows * rowH + 6;
        return { ...block, end: y };
      });
    };
    let p = plan(small);
    while (p[p.length - 1].end > bottom && small > 40) p = plan(--small);
    for (const b of p) {
      const rc = RARITY_COLOR[b.r];
      rr(ctx, PAD, b.y, W - PAD * 2, 54, 14);
      ctx.fillStyle = mix(rc, th.bottom, 0.55);
      ctx.fill();
      ctx.fillStyle = rc;
      ctx.fillRect(PAD, b.y, 12, 54);
      fitText(ctx, o.rarityLabel(b.r).toUpperCase(), PAD + 32, b.y + 40, 600, "900", 38, DISPLAY, "#ffffff");
      const got = b.items.filter((s) => st(o.collection, s)).length;
      fitText(ctx, `${got}/${b.items.length}`, W - PAD - 24, b.y + 40, 200, "900", 38, DISPLAY, "#ffffff", "right");
      const gap = b.cols > 1 ? (W - PAD * 2 - b.cols * b.cw) / (b.cols - 1) : 0;
      b.items.forEach((s, i) => {
        const r = Math.floor(i / b.cols), c = i % b.cols;
        const x = PAD + c * (b.cw + gap), y = b.y + 70 + r * b.rowH;
        const v = st(o.collection, s);
        sticker(ctx, o, s, v, imgs.get(s.id) ?? null, x, y, b.cw, b.cw * 1.25);
        badge(ctx, x + b.cw / 2, y + b.cw * 1.25 + b.cw / 7.5, Math.max(8, b.cw / 8), v);
      });
    }
    footer(ctx, o, th, H - 180, 150);
  } else if (o.kind === "help") {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, mix(th.accent, th.bottom, 0.72));
    bg.addColorStop(1, th.bottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    avatar(ctx, av, PAD, 60, 96, th.accent);
    brand(ctx, PAD + 122, 124, 56, th.accent);
    const miss = slots.filter((s) => !st(o.collection, s));
    fitText(ctx, (miss.length ? T.helpTitle : T.complete).toUpperCase(), PAD, 280, W - PAD * 2, "900", 96, DISPLAY, "#ffffff");
    fitText(ctx, T.helpSub, PAD + 2, 336, W - PAD * 2, "700", 34, BODY, "#ffcde1");
    let top = 390;
    if (T.closest && miss.length) {
      rr(ctx, PAD, 372, W - PAD * 2, 78, 20);
      ctx.fillStyle = th.accent;
      ctx.fill();
      fitText(ctx, T.closest, PAD + 28, 422, W - PAD * 2 - 56, "700", 32, BODY, "#ffffff");
      top = 484;
    }
    const bottom = H - 250;
    const shown = miss.slice(0, 60);
    const g = fitGrid(shown.length, W - PAD * 2, bottom - top, 92, 22, 200);
    shown.forEach((s, i) => {
      const r = Math.floor(i / g.cols), c = i % g.cols;
      const x = PAD + c * (g.cw + g.gap), y = top + r * g.rowH;
      // aqui a figurinha aparece colorida (é a que eu procuro), com um "?" de procura
      sticker(ctx, o, s, 1, imgs.get(s.id) ?? null, x, y, g.cw, g.ch);
      const qr = Math.max(14, g.cw / 6.5);
      ctx.beginPath();
      ctx.arc(x + g.cw - qr / 2, y + qr / 3, qr, 0, Math.PI * 2);
      ctx.fillStyle = th.accent;
      ctx.fill();
      ctx.lineWidth = Math.max(2, qr / 6);
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      fitText(ctx, "?", x + g.cw - qr / 2, y + qr / 3 + qr * 0.45, qr * 2, "900", Math.round(qr * 1.3), DISPLAY, "#ffffff", "center");
      const k = g.cw / 120;
      fitText(ctx, o.spriteName(s.sprite.key), x + g.cw / 2, y + g.ch + 30 * k, g.cw + g.gap - 4, "900", Math.round(26 * k), DISPLAY, "#ffffff", "center", 10);
      const vc = o.season.variants.find((v) => v.key === s.variant)?.color ?? "#ffffff";
      fitText(ctx, o.variantLabel(s.variant), x + g.cw / 2, y + g.ch + 58 * k, g.cw + g.gap - 4, "700", Math.round(20 * k), BODY, vc, "center", 9);
    });
    if (miss.length > shown.length) fitText(ctx, `+${miss.length - shown.length}`, W - PAD, bottom + 10, 200, "900", 40, DISPLAY, "#ffffff", "right");
    footer(ctx, o, th, H - 220, 170);
  } else if (o.kind === "page") {
    ctx.fillStyle = "#eceff8";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(29,22,64,0.035)";
    for (let y = 12; y < H; y += 18) for (let x = 12; x < W; x += 18) ctx.fillRect(x, y, 2, 2);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, 170);
    brand(ctx, PAD, 112, 72, th.accent);
    fitText(ctx, T.seasonShort.toUpperCase(), W - PAD, 92, 400, "900", 52, DISPLAY, th.accent, "right");
    fitText(ctx, T.pageSub, W - PAD, 132, 520, "600", 24, BODY, "#dcd6f6", "right");
    // elementais com as figurinhas da temporada; 2 ou 3 colunas, figurinha do maior tamanho que couber
    const sps = o.season.sprites.map((sp) => ({ sp, list: sp.slots.filter((s) => slots.some((x) => x.id === s.id)) })).filter((x) => x.list.length);
    const maxV = Math.max(...sps.map((x) => x.list.length));
    const top = 200, bottom = H - 210;
    let best = { cols: 2, cw: 0 };
    for (const cols of [2, 3]) {
      const colW = (W - PAD * 2 - (cols - 1) * 36) / cols;
      for (let cw = 140; cw >= 36; cw--) {
        const gap = cw / 8;
        if (maxV * cw + (maxV - 1) * gap > colW) continue;
        const per = Math.ceil(sps.length / cols);
        if (per * (44 * (cw / 106) + cw * 1.25 + 24) <= bottom - top) {
          if (cw > best.cw) best = { cols, cw };
          break;
        }
      }
    }
    const { cols, cw } = best.cw ? best : { cols: 3, cw: 40 };
    const colW = (W - PAD * 2 - (cols - 1) * 36) / cols;
    const ch = cw * 1.25, gap = cw / 8, k = cw / 106;
    const ys = Array(cols).fill(top);
    let seed = 3;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (const { sp, list } of sps) {
      const ci = ys.indexOf(Math.min(...ys));
      const x0 = PAD + ci * (colW + 36);
      let y = ys[ci];
      ctx.beginPath();
      ctx.arc(x0 + 8 * k, y + 18 * k, 8 * k, 0, Math.PI * 2);
      ctx.fillStyle = RARITY_COLOR[sp.rarity];
      ctx.fill();
      fitText(ctx, o.spriteName(sp.key).toUpperCase(), x0 + 24 * k, y + 30 * k, colW - 30 * k, "900", Math.round(32 * k), DISPLAY, INK, "left", 10);
      y += 44 * k;
      list.forEach((s, i) => {
        const v = st(o.collection, s);
        const x = x0 + i * (cw + gap);
        ctx.save();
        if (v) {
          // colada meio torta, como num álbum de verdade
          const a = (rnd() - 0.5) * 0.12;
          ctx.translate(x + cw / 2, y + ch / 2);
          ctx.rotate(a);
          ctx.translate(-(x + cw / 2), -(y + ch / 2));
        }
        sticker(ctx, o, s, v, imgs.get(s.id) ?? null, x, y, cw, ch, true);
        ctx.restore();
        if (v) {
          const br = Math.max(8, cw / 7);
          ctx.beginPath();
          ctx.arc(x + cw - br / 2, y + ch - br / 2, br, 0, Math.PI * 2);
          ctx.fillStyle = v === 2 ? "#e8b40a" : "#3eb44f";
          ctx.fill();
          ctx.lineWidth = Math.max(2, br / 4);
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
          fitText(ctx, v === 2 ? "★" : "✓", x + cw - br / 2, y + ch - br / 2 + br * 0.38, br * 2, "900", Math.round(br * 1.1), "sans-serif", "#ffffff", "center", 8);
        }
      });
      ys[ci] = y + ch + 24 * k;
    }
    footer(ctx, o, th, H - 186, 150, false);
  } else {
    // duelo
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, mix(th.accent2, th.top, 0.5));
    bg.addColorStop(1, th.bottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    fitText(ctx, `${T.duelTitle} · ${T.seasonShort}`.toUpperCase(), W / 2, 110, W - PAD * 2, "900", 54, DISPLAY, "#ffffff", "center");
    const fo = slots.filter((s) => st(o.friend, s)).length;
    avatar(ctx, av, 158, 150, 150, th.accent);
    fitText(ctx, T.me.toUpperCase(), 233, 372, 300, "900", 56, DISPLAY, "#ffffff", "center");
    fitText(ctx, `${owned}/${slots.length}`, 233, 462, 320, "900", 92, DISPLAY, "#62de6e", "center");
    // amigo: boneco genérico
    const fx = W - 158 - 150;
    ctx.beginPath();
    ctx.arc(fx + 75, 225, 79, 0, Math.PI * 2);
    ctx.fillStyle = "#2e9bff";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.beginPath();
    ctx.arc(fx + 75, 200, 29, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + 75, 300, 57, Math.PI, 0);
    ctx.fill();
    fitText(ctx, T.friend.toUpperCase(), W - 233, 372, 320, "900", 56, DISPLAY, "#ffffff", "center");
    fitText(ctx, `${fo}/${slots.length}`, W - 233, 462, 320, "900", 92, DISPLAY, "#78beff", "center");
    ctx.beginPath();
    ctx.arc(W / 2, 320, 70, 0, Math.PI * 2);
    ctx.fillStyle = th.accent;
    ctx.fill();
    fitText(ctx, "VS", W / 2, 348, 120, "900", 80, DISPLAY, "#ffffff", "center");
    const groups = [
      { title: T.onlyMe, color: "#62de6e", items: slots.filter((s) => st(o.collection, s) && !st(o.friend, s)) },
      { title: T.onlyFriend, color: "#78beff", items: slots.filter((s) => st(o.friend, s) && !st(o.collection, s)) },
      { title: T.both, color: "#fad63c", items: slots.filter((s) => st(o.friend, s) && st(o.collection, s)) },
    ];
    const top = 540, bottom = H - 250;
    let cw = 118;
    const need = (c: number) => {
      const cols = Math.max(1, Math.floor((W - PAD * 2 + 14) / (c + 14)));
      return groups.reduce((h, g) => h + 58 + Math.ceil(Math.max(1, g.items.length) / cols) * (c * 1.25 + 18) + 30, 0);
    };
    while (need(cw) > bottom - top && cw > 34) cw--;
    const cols = Math.max(1, Math.floor((W - PAD * 2 + 14) / (cw + 14)));
    const gap = cols > 1 ? (W - PAD * 2 - cols * cw) / (cols - 1) : 0;
    let y = top;
    for (const g of groups) {
      fitText(ctx, `${g.title} (${g.items.length})`.toUpperCase(), PAD, y + 40, W - PAD * 2, "900", 40, DISPLAY, g.color);
      y += 58;
      g.items.forEach((s, i) => {
        const r = Math.floor(i / cols), c = i % cols;
        sticker(ctx, o, s, 1, imgs.get(s.id) ?? null, PAD + c * (cw + gap), y + r * (cw * 1.25 + 18), cw, cw * 1.25);
      });
      y += Math.ceil(Math.max(1, g.items.length) / cols) * (cw * 1.25 + 18) + 30;
    }
    footer(ctx, o, th, H - 220, 170);
  }
  return toBlob(cv, o.format);
}
