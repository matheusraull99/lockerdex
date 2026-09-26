import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/big-shoulders-display/800";
import "@fontsource/big-shoulders-display/900";
import "@fontsource-variable/figtree";
import "./styles.css";
import "./portal.css";
import { I18nProvider, preloadLocale } from "./lib/i18n";
import App from "./App";
import { migrateHashRoute } from "./lib/router";

// Links antigos (#/shop, #/lists?w=…) viram endereços de verdade antes de montar o app.
migrateHashRoute();

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
  addEventListener("load", () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {}));
}
