import { useEffect, useState } from "react";

/** Evento de instalação do Chrome/Edge/Android (não existe no Safari). */
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPrompt | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());
let installedNow = false;

// Registrado antes do React montar: o evento pode chegar logo no carregamento.
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e as InstallPrompt;
  notify();
});
addEventListener("appinstalled", () => {
  deferred = null;
  installedNow = true;
  notify();
});

export const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  }, []);
  return {
    /** o navegador oferece a instalação com um toque */
    canPrompt: !!deferred,
    installed: installedNow || isStandalone(),
    ios: isIOS(),
    async prompt() {
      // Lança erro se o navegador recusar (ex.: sem gesto do usuário); quem chama mostra o passo a passo.
      if (!deferred) throw new Error("sem prompt");
      const d = deferred;
      await d.prompt();
      const { outcome } = await d.userChoice;
      deferred = null;
      notify();
      return outcome === "accepted";
    },
  };
}
