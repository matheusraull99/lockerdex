// Lockerdex offline. No build, CACHE e PRECACHE são preenchidos pelo vite.config.ts.
const CACHE = "lockerdex-dev";
const PRECACHE = [];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => (k.startsWith("lockerdex-") || k.startsWith("spritedex-")) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isApi = url.origin === "https://fortnite-api.com" && req.destination !== "image";
  if (url.origin !== location.origin && req.destination !== "image" && !isApi) return;

  // Dados ao vivo (loja, notícias, mapa…): rede primeiro; sem internet, a última versão salva.
  if (isApi) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || Response.error())),
    );
    return;
  }

  // Catálogo de cosméticos (public/data): responde com o salvo e atualiza por trás.
  if (url.origin === location.origin && url.pathname.includes("/data/")) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req).then((res) => {
            if (res.ok) c.put(req, res.clone());
            return res;
          });
          return hit || net;
        }),
      ),
    );
    return;
  }

  // Página: rede primeiro (pega a versão nova), cache quando estiver offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./", copy));
          return res;
        })
        .catch(() => caches.match("./")),
    );
    return;
  }

  // Arquivos do app e ícones dos sprites: cache primeiro, e guarda o que vier da rede.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === "opaque") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
