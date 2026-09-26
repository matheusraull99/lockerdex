import { useEffect, useState } from "react";
import { LANGS } from "./langs";
import SLUGS from "./routes.json";

/*
 * Rotas com endereço de verdade (/lockerdex/shop/…), para cada página aparecer no Google.
 * O build gera um index.html por rota (vite.config.ts), então abrir o endereço direto funciona.
 * Os links antigos com "#/rota?…" são convertidos na primeira carga (migrateHashRoute).
 * Dados de compartilhamento continuam no "#" (#c=… da coleção, #w=…&k=… das listas), para não irem ao servidor.
 * Versões por idioma para o Google: /lockerdex/pt-BR/shop/ (o prefixo escolhe o idioma e segue nos links).
 */
export type Route = "sprites" | "shop" | "cosmetics" | "lists" | "leaks" | "tracks" | "map" | "news" | "season" | "more";

// A mesma tabela alimenta o build (vite.config.ts), que gera uma página pronta por endereço.
export const SLUG: Record<Route, string> = SLUGS;

const BASE: string = import.meta.env.BASE_URL; // "/lockerdex/"
export const NAV_EVENT = "lockerdex:navigate";

const LANG_CODES = new Set(LANGS.map((l) => l.code));

/** Partes do caminho depois da base: [idioma?, rota?]. */
function pathParts(pathname = location.pathname) {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\/+/, "");
  const parts = rest.split("/").filter(Boolean);
  const lang = parts[0] && LANG_CODES.has(parts[0]) ? parts.shift()! : null;
  return { lang, slug: parts.join("/") };
}

/** Idioma pedido pelo endereço (/lockerdex/ja/…), ou null. */
export const pathLang = () => pathParts().lang;

/** Troca o idioma do prefixo no endereço atual (quem está numa versão /xx/ muda para /yy/). */
export function replacePathLang(code: string) {
  const { lang, slug } = pathParts();
  if (!lang) return;
  history.replaceState(history.state, "", `${BASE}${code}/${slug ? `${slug}/` : ""}${location.search}${location.hash}`);
}

function routeOfSlug(slug: string): Route | null {
  const hit = (Object.keys(SLUG) as Route[]).find((r) => SLUG[r] === slug);
  return hit ?? null;
}

export function parseLocation(): { route: Route; params: URLSearchParams } {
  const route = routeOfSlug(pathParts().slug) ?? "sprites";
  // Parâmetros da busca (?q=, ?tab=) + os do "#" em formato chave=valor (listas compartilhadas).
  const params = new URLSearchParams(location.search);
  const h = location.hash.slice(1);
  if (h.includes("=")) new URLSearchParams(h).forEach((v, k) => params.set(k, v));
  return { route, params };
}

export function href(route: Route, params?: Record<string, string>) {
  const slug = SLUG[route];
  const lang = pathParts().lang; // quem entrou por /pt-BR/ continua em /pt-BR/
  const q = params && Object.keys(params).length ? `?${new URLSearchParams(params)}` : "";
  return `${BASE}${lang ? `${lang}/` : ""}${slug ? `${slug}/` : ""}${q}`;
}

/** Navega sem recarregar. O mesmo endereço substitui a entrada (não empilha "voltar" repetido). */
function navigateTo(to: string) {
  if (to === location.pathname + location.search + location.hash) history.replaceState(history.state, "", to);
  else history.pushState(null, "", to);
  dispatchEvent(new Event(NAV_EVENT));
}

export function go(route: Route, params?: Record<string, string>) {
  navigateTo(href(route, params));
}

/** Links antigos: "#/shop" → /shop/, "#/lists?w=…" → /lists/#w=… (os dados das listas ficam no "#"). */
export function migrateHashRoute() {
  const h = location.hash;
  if (!h.startsWith("#/")) return;
  const [path, query = ""] = h.slice(2).split("?");
  const route = routeOfSlug(path) ?? (path === "tracks" ? "tracks" : "sprites");
  const qs = new URLSearchParams(query);
  const share = new URLSearchParams();
  for (const k of ["w", "k", "n"]) if (qs.has(k)) (share.set(k, qs.get(k)!), qs.delete(k));
  const rest = Object.fromEntries(qs);
  history.replaceState(null, "", href(route, rest) + (share.toString() ? `#${share}` : ""));
}

/** Links internos viram navegação sem recarregar a página (quem não tem JS ainda recebe a página pronta). */
function onClick(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest?.("a");
  if (!a || a.target || a.hasAttribute("download")) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !url.pathname.startsWith(BASE)) return;
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return; // âncora na mesma página
  e.preventDefault();
  navigateTo(url.pathname + url.search + url.hash);
}

export function useRoute() {
  const [state, setState] = useState(parseLocation);
  useEffect(() => {
    const on = () => {
      migrateHashRoute(); // link antigo "#/rota" colado na mesma aba
      setState(parseLocation());
      scrollTo({ top: 0 });
    };
    addEventListener("popstate", on);
    addEventListener(NAV_EVENT, on);
    document.addEventListener("click", onClick);
    return () => {
      removeEventListener("popstate", on);
      removeEventListener(NAV_EVENT, on);
      document.removeEventListener("click", onClick);
    };
  }, []);
  return state;
}
