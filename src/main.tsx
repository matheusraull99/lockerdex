import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/big-shoulders-display/800";
import "@fontsource/big-shoulders-display/900";
import "@fontsource-variable/figtree";
import "./styles.css";
import "./portal.css";
import "./fn-style.css";
import "./mobile.css";
import { I18nProvider, preloadLocale } from "./lib/i18n";
import App from "./App";
import { migrateHashRoute } from "./lib/router";
import { applyTheme, savedTheme } from "./lib/theme";

// Links antigos (#/shop, #/lists?w=…) viram endereços de verdade antes de montar o app.
migrateHashRoute();

// Cor escolhida: o index.html já aplicou o CSS guardado; aqui ele é refeito pela conta atual.
applyTheme(savedTheme());

// Enquanto o idioma carrega, fica à mostra a página pronta do build (texto e links no idioma certo).
preloadLocale().finally(() =>
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <I18nProvider>
        <App />
      </I18nProvider>
    </StrictMode>,
  ),
);

// Offline: o service worker só entra no build de produção.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  // App instalado fica aberto em segundo plano dias a fio: ao voltar para ele, confere se saiu versão nova.
  // Quando a nova assume (o sw.js faz skipWaiting + clients.claim), recarrega uma vez para mostrar a versão nova.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || reloaded) return; // primeira instalação: nada a recarregar
    reloaded = true;
    location.reload();
  });
  addEventListener("load", () =>
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then((reg) => {
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        });
      })
      .catch(() => {}),
  );
}
