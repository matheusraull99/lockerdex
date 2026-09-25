import { useEffect, useState } from "react";

/*
 * Rotas por hash (#/loja…), para funcionar em qualquer hospedagem estática.
 * O link antigo de coleção de sprites (#c=…) continua caindo na página de sprites.
 */
export type Route = "sprites" | "shop" | "cosmetics" | "lists" | "leaks" | "tracks" | "map" | "news" | "season" | "more";

const ROUTES: Route[] = ["sprites", "shop", "cosmetics", "lists", "leaks", "tracks", "map", "news", "season", "more"];

export function parseHash(hash = location.hash): { route: Route; params: URLSearchParams } {
  const h = hash.replace(/^#/, "");
  if (!h.startsWith("/")) return { route: "sprites", params: new URLSearchParams(h) };
  const [path, query = ""] = h.slice(1).split("?");
  const route = (ROUTES.includes(path as Route) ? path : "sprites") as Route;
  return { route, params: new URLSearchParams(query) };
}

export function href(route: Route, params?: Record<string, string>) {
  const q = params ? new URLSearchParams(params).toString() : "";
  return route === "sprites" && !q ? "#/" : `#/${route}${q ? `?${q}` : ""}`;
}

export function go(route: Route, params?: Record<string, string>) {
  location.hash = href(route, params);
}

export function useRoute() {
  const [state, setState] = useState(parseHash);
  useEffect(() => {
    const on = () => {
      setState(parseHash());
      scrollTo({ top: 0 });
    };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return state;
}
