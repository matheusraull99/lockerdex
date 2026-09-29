/*
 * Cor do site escolhida por quem usa. Uma cor vira a paleta inteira, nos temas claro e escuro:
 * os fundos ganham a matiz dela com a mesma claridade do tema padrão (o contraste do texto não muda)
 * e o destaque (--dust) fica numa claridade que continua legível nos dois temas. Contas em OKLCH.
 *
 * Fica em chave própria, fora de spritedex:v1: as preferências do álbum regravam o objeto `prefs`
 * inteiro. O index.html aplica o CSS guardado antes de a página aparecer (sem piscar a cor padrão).
 */

const KEY = "lockerdex:theme";
const STYLE_ID = "lockerdex-theme";

type Oklch = [number, number, number];
type Mode = "light" | "dark";

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function linearOfHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [lin(((n >> 16) & 255) / 255), lin(((n >> 8) & 255) / 255), lin((n & 255) / 255)];
}

function oklchOf(hex: string): Oklch {
  const [r, g, b] = linearOfHex(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}

function linearOf([L, C, H]: Oklch): [number, number, number] {
  const h = (H * Math.PI) / 180;
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/** OKLCH para hex. Fora do sRGB, reduz só o croma (claridade e matiz ficam). */
function hexOf([L, C, H]: Oklch): string {
  if (!inGamut(linearOf([L, C, H]))) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(linearOf([L, mid, H]))) lo = mid;
      else hi = mid;
    }
    C = lo;
  }
  return `#${linearOf([L, C, H])
    .map((v) => Math.round(clamp(gam(clamp(v, 0, 1)), 0, 1) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

const luminance = (hex: string) => {
  const [r, g, b] = linearOfHex(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** Claridade e croma dos fundos e textos do tema padrão (medidos dos tokens do styles.css). */
const BASE: Record<Mode, Record<string, [number, number]>> = {
  light: { paper: [0.952, 0.012], page: [0.982, 0.005], ink: [0.236, 0.077], "ink-soft": [0.47, 0.071], line: [0.883, 0.023], slot: [0.925, 0.017], "slot-line": [0.761, 0.039] },
  dark: { paper: [0.179, 0.046], page: [0.222, 0.071], ink: [0.954, 0.024], "ink-soft": [0.729, 0.068], line: [0.308, 0.085], slot: [0.255, 0.076], "slot-line": [0.421, 0.099] },
};

/** Anda a claridade (para baixo ou para cima) até a cor ter o contraste mínimo contra outra. */
function readable([L, C, H]: Oklch, against: string, min: number, step: -0.01 | 0.01) {
  let hex = hexOf([L, C, H]);
  for (let i = 0; i < 60 && contrast(hex, against) < min; i++) hex = hexOf([(L = clamp(L + step, 0.05, 0.97)), C, H]);
  return hex;
}

export function palette(hex: string, mode: Mode): Record<string, string> {
  const [L, C, H] = oklchOf(hex);
  const k = Math.min(1, C / 0.1); // cor quase cinza = fundos neutros
  const out: Record<string, string> = {};
  for (const [name, [l, c]] of Object.entries(BASE[mode])) out[name] = hexOf([l, c * k, H]);
  // Destaque: é texto em vários lugares (a marca, "a temporada acaba em…"), então precisa ler no fundo.
  out.dust =
    mode === "light"
      ? readable([clamp(L, 0.5, 0.7), C, H], out.paper, 3, -0.01)
      : readable([clamp(L, 0.62, 0.84), C, H], out.paper, 4.5, 0.01);
  const darkInk = hexOf([BASE.light.ink[0], BASE.light.ink[1] * k, H]);
  out["dust-ink"] = contrast(out.dust, "#ffffff") >= contrast(out.dust, darkInk) ? "#ffffff" : darkInk;
  // Segunda cor (foco, marcadores, faixa da coleção do amigo com texto branco): a mesma matiz, mais funda.
  out.storm = mode === "light" ? readable([0.5, Math.min(C, 0.22), H], "#ffffff", 4.5, -0.01) : hexOf([0.6, Math.min(C, 0.2), H]);
  return out;
}

export function themeCss(hex: string) {
  const decl = (p: Record<string, string>) => Object.entries(p).map(([k, v]) => `--${k}:${v}`).join(";");
  return `:root{${decl(palette(hex, "light"))}}@media (prefers-color-scheme: dark){:root{${decl(palette(hex, "dark"))}}}`;
}

const valid = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** Cor salva neste aparelho, ou null (tema padrão). */
export function savedTheme(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    return valid(v?.hex) ? v.hex.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Aplica sem salvar (usado enquanto a pessoa arrasta o seletor de cor). */
export function applyTheme(hex: string | null) {
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  let el = document.getElementById(STYLE_ID);
  if (!valid(hex)) {
    el?.remove();
    metas.forEach((m) => m.dataset.default && (m.content = m.dataset.default));
    return;
  }
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.append(el);
  }
  el.textContent = themeCss(hex);
  // Barra do navegador e do app instalado na mesma cor do fundo.
  const bar = { light: palette(hex, "light").paper, dark: palette(hex, "dark").paper };
  metas.forEach((m) => {
    m.dataset.default ??= m.content;
    m.content = /dark/.test(m.media) ? bar.dark : bar.light;
  });
}

/** Aplica e salva. null volta ao tema padrão. */
export function setTheme(hex: string | null) {
  applyTheme(hex);
  try {
    if (valid(hex)) {
      localStorage.setItem(KEY, JSON.stringify({ hex, css: themeCss(hex), bar: [palette(hex, "light").paper, palette(hex, "dark").paper] }));
    } else localStorage.removeItem(KEY);
  } catch {
    /* navegação privada: vale só nesta visita */
  }
}
