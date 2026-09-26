import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Preenche o service worker (public/sw.js) com a lista de arquivos do build, para o
 * app abrir offline já depois da primeira visita. O nome do cache muda a cada build.
 */
function precacheSw(): Plugin {
  let files: string[] = [];
  let outDir = "dist";
  return {
    name: "lockerdex-precache",
    apply: "build",
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
    },
    generateBundle(_, bundle) {
      files = Object.keys(bundle).filter((f) => !f.endsWith(".map"));
    },
    closeBundle() {
      const swPath = resolve(outDir, "sw.js");
      const list = ["./", ...files.map((f) => `./${f}`), "./manifest.webmanifest", "./icon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
      // A versão do cache segue o conteúdo: muda quando qualquer arquivo guardado muda.
      const h = createHash("sha1");
      for (const u of list) {
        h.update(u);
        try {
          h.update(readFileSync(resolve(outDir, u === "./" ? "index.html" : u.slice(2))));
        } catch {
          // arquivo que não saiu no build: entra só pelo nome
        }
      }
      const hash = h.digest("hex").slice(0, 10);
      const sw = readFileSync(swPath, "utf8")
        .replace('const CACHE = "lockerdex-dev";', `const CACHE = "lockerdex-${hash}";`)
        .replace("const PRECACHE = [];", `const PRECACHE = ${JSON.stringify(list)};`);
      writeFileSync(swPath, sw);
    },
  };
}

type Loc = { meta: { name: string; dir: string }; ui: Record<string, string> };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Idioma do app → og:locale (formato do Open Graph). */
const OG_LOCALE: Record<string, string> = {
  en: "en_US", "pt-BR": "pt_BR", "pt-PT": "pt_PT", es: "es_ES", "es-419": "es_LA", fr: "fr_FR", de: "de_DE", it: "it_IT",
  nl: "nl_NL", pl: "pl_PL", tr: "tr_TR", ru: "ru_RU", uk: "uk_UA", ar: "ar_AR", hi: "hi_IN", th: "th_TH", vi: "vi_VN",
  id: "id_ID", ja: "ja_JP", ko: "ko_KR", "zh-CN": "zh_CN", "zh-TW": "zh_TW",
};

/**
 * O Google não aceita o código 419 (América Latina) no hreflang: a versão es-419
 * é anunciada país por país.
 */
const HREFLANG: Record<string, string[]> = {
  "es-419": ["es-MX", "es-AR", "es-CO", "es-CL", "es-PE", "es-VE", "es-EC", "es-GT", "es-CU", "es-BO", "es-DO", "es-HN", "es-PY", "es-SV", "es-NI", "es-CR", "es-PA", "es-UY", "es-PR", "es-US"],
};

/** Título e descrição de cada rota, com textos que já existem nos 22 idiomas. */
const ROUTE_TEXT: Record<string, { title: string | null; desc: string }> = {
  sprites: { title: null, desc: "more.sprites" },
  shop: { title: "nav.shop", desc: "more.shop" },
  cosmetics: { title: "nav.cosmetics", desc: "more.cosmetics" },
  lists: { title: "nav.lists", desc: "more.wishlist" },
  leaks: { title: "nav.leaks", desc: "more.leaks" },
  tracks: { title: "nav.tracks", desc: "more.tracks" },
  map: { title: "nav.map", desc: "more.map" },
  news: { title: "nav.news", desc: "more.news" },
  season: { title: "nav.season", desc: "more.season" },
  more: { title: "nav.more", desc: "app.tagline" },
};

/**
 * Uma página pronta por endereço, para o Google e para a prévia de link (WhatsApp, Discord),
 * que não rodam o app: /lockerdex/<rota>/ (versão padrão, em inglês) e /lockerdex/<idioma>/<rota>/.
 * Cada uma leva título, descrição, canônico, as 22 versões (hreflang), Open Graph e um texto com
 * links internos dentro do #root (o React troca esse conteúdo ao carregar). Gera também
 * sitemap.xml, robots.txt e 404.html.
 */
function seoPages(env: Record<string, string>): Plugin {
  let outDir = "dist";
  let root = ".";
  let base = "/";
  return {
    name: "lockerdex-seo-pages",
    apply: "build",
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
      root = c.root;
      base = c.base;
    },
    closeBundle() {
      const origin = (env.SITE_ORIGIN || "https://matheusraull99.github.io").replace(/\/$/, "");
      const site = origin + base;
      const slugs: Record<string, string> = JSON.parse(readFileSync(resolve(root, "src/lib/routes.json"), "utf8"));
      const locDir = resolve(root, "src/i18n/locales");
      const langs = readdirSync(locDir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();
      const locs: Record<string, Loc> = Object.fromEntries(langs.map((l) => [l, JSON.parse(readFileSync(resolve(locDir, `${l}.json`), "utf8"))]));
      const template = readFileSync(resolve(outDir, "index.html"), "utf8");
      const verification = env.VITE_GSC_VERIFICATION?.trim();
      const urls: string[] = [];

      const pathOf = (lang: string | null, route: string) => `${lang ? `${lang}/` : ""}${slugs[route] ? `${slugs[route]}/` : ""}`;

      const page = (lang: string | null, route: string, opts: { noindex?: boolean } = {}) => {
        const code = lang ?? "en";
        const L = locs[code];
        const t = (k: string) => L.ui[k] ?? locs.en.ui[k] ?? k;
        const rt = ROUTE_TEXT[route];
        const title = rt.title ? `${t(rt.title)} · Fortnite — Lockerdex` : `Lockerdex — ${t("app.tagline")}`;
        const desc = t(rt.desc);
        const url = site + pathOf(lang, route);
        const alternates = [
          ...langs.flatMap((l) => (HREFLANG[l] ?? [l]).map((h) => `<link rel="alternate" hreflang="${h}" href="${site}${pathOf(l, route)}" />`)),
          `<link rel="alternate" hreflang="x-default" href="${site}${pathOf(null, route)}" />`,
        ];
        const head = [
          `<title>${esc(title)}</title>`,
          `<meta name="description" content="${esc(desc)}" />`,
          opts.noindex ? `<meta name="robots" content="noindex" />` : `<link rel="canonical" href="${url}" />`,
          ...(opts.noindex ? [] : alternates),
          `<meta property="og:type" content="website" />`,
          `<meta property="og:site_name" content="Lockerdex" />`,
          `<meta property="og:title" content="${esc(title)}" />`,
          `<meta property="og:description" content="${esc(desc)}" />`,
          `<meta property="og:url" content="${url}" />`,
          `<meta property="og:image" content="${site}og.png" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta property="og:locale" content="${OG_LOCALE[code] ?? "en_US"}" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          ...(verification ? [`<meta name="google-site-verification" content="${esc(verification)}" />`] : []),
          ...(route === "sprites" && !opts.noindex
            ? [
                `<script type="application/ld+json">${JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "WebSite",
                  name: "Lockerdex",
                  url,
                  description: desc,
                  inLanguage: code,
                }).replace(/</g, "\\u003c")}</script>`,
              ]
            : []),
        ].join("\n    ");
        // Texto e links visíveis antes do JavaScript (e para quem não roda JavaScript).
        const nav = Object.keys(slugs)
          .map((r) => `<li><a href="${base}${pathOf(lang, r)}">${esc(ROUTE_TEXT[r].title ? t(ROUTE_TEXT[r].title!) : t("nav.sprites"))}</a></li>`)
          .join("");
        const body = `<main class="seo-shell"><h1>${esc(rt.title ? t(rt.title) : "Lockerdex")}</h1><p>${esc(desc)}</p><ul>${nav}</ul></main>`;
        let html = template.replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, head).replace("<!--seo:body-->", body);
        html = html.replace(/<html lang="[^"]*"[^>]*>/, `<html lang="${code}" dir="${L.meta.dir === "rtl" ? "rtl" : "ltr"}">`);
        return { html, url };
      };

      const write = (rel: string, html: string) => {
        const dir = resolve(outDir, rel);
        mkdirSync(dir, { recursive: true });
        writeFileSync(resolve(dir, "index.html"), html);
      };

      for (const route of Object.keys(slugs)) {
        for (const lang of [null, ...langs]) {
          const { html, url } = page(lang, route);
          write(pathOf(lang, route), html);
          urls.push(url);
        }
      }
      // 404 do GitHub Pages: abre o app (que resolve o endereço) e não entra no Google.
      writeFileSync(resolve(outDir, "404.html"), page(null, "sprites", { noindex: true }).html);

      writeFileSync(
        resolve(outDir, "sitemap.xml"),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
          .map((u) => `  <url><loc>${u}</loc></url>`)
          .join("\n")}\n</urlset>\n`,
      );
      // Só vale na raiz do domínio; aqui fica pronto para quando o site ganhar domínio próprio.
      writeFileSync(resolve(outDir, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${site}sitemap.xml\n`);
      console.log(`seo: ${urls.length} páginas, sitemap.xml, robots.txt e 404.html`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env } as Record<string, string>;
  return {
    // Endereços de verdade (/lockerdex/shop/) pedem base absoluta. Com domínio próprio, BASE_PATH=/
    base: env.BASE_PATH || "/lockerdex/",
    plugins: [react(), seoPages(env), precacheSw()],
  };
});
