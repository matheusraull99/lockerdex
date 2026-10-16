import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { SEASONS } from "./lib/data";
import { useI18n } from "./lib/i18n";
import { OFFERED } from "./lib/langs";
import { href, useRoute, type Route } from "./lib/router";
import { UiContext, type Ui } from "./lib/ui";
import { useInstall } from "./lib/pwa";
import { feedbackEnabled } from "./lib/feedback";
import { InstallDialog } from "./components/InstallDialog";
import { FeedbackDialog } from "./components/FeedbackDialog";
import { ThemeDialog } from "./components/ThemeDialog";
import { AvatarBadge, Walker } from "./components/Avatar";
import { SpritesPage } from "./pages/SpritesPage";
import { ShopPage } from "./pages/ShopPage";
import { CosmeticsPage } from "./pages/CosmeticsPage";
import { ListsPage } from "./pages/ListsPage";
import { LeaksPage } from "./pages/LeaksPage";
import { TracksPage } from "./pages/TracksPage";
import { MapPage } from "./pages/MapPage";
import { NewsPage } from "./pages/NewsPage";
import { SeasonPage } from "./pages/SeasonPage";
import { HistoryPage } from "./pages/HistoryPage";
import { MorePage } from "./pages/MorePage";
import { IslandsPage } from "./pages/IslandsPage";
import { HomePage } from "./pages/HomePage";
import { FreeGamesPage } from "./pages/FreeGamesPage";
import { SupportPage } from "./pages/SupportPage";
import { pixConfig, pixPayload } from "./lib/pix";
import { SupportBar } from "./components/SupportBar";

const CURRENT = SEASONS.find((s) => s.current) ?? SEASONS[0];

type NavKey = "nav.home" | "nav.sprites" | "nav.shop" | "nav.cosmetics" | "nav.lists" | "nav.map" | "nav.history" | "nav.more";

/** Ícones da barra de abas, desenhados no traço do app. */
const ICON: Record<string, ReactElement> = {
  home: <path d="M4 11.5 12 4l8 7.5M6.5 9.5V20h11V9.5M10 20v-5h4v5" />,
  sprites: <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 3v8h8V6H8Zm1 11h6" />,
  shop: <path d="M5 8h14l-1 12H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2" />,
  cosmetics: <path d="M12 3l2.2 5.6L20 9l-4.5 3.7L17 19l-5-3.2L7 19l1.5-6.3L4 9l5.8-.4L12 3Z" />,
  lists: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  map: <path d="M12 21s6-5.7 6-11a6 6 0 0 0-12 0c0 5.3 6 11 6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  history: <path d="M12 7v5l3 2m6-2a9 9 0 1 1-3-6.7M21 4v4h-4" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3.2" />,
};

// No celular ficam Elementais, Loja, Início (no meio), Mapa e Mais; o resto mora em "Mais".
const TABS: { route: Route; label: NavKey; mobile: boolean }[] = [
  { route: "sprites", label: "nav.sprites", mobile: true },
  { route: "shop", label: "nav.shop", mobile: true },
  { route: "cosmetics", label: "nav.cosmetics", mobile: false },
  { route: "lists", label: "nav.lists", mobile: false },
  { route: "map", label: "nav.map", mobile: true },
  { route: "history", label: "nav.history", mobile: false },
  { route: "more", label: "nav.more", mobile: true },
];
const MOBILE_TABS: { route: Route; label: NavKey }[] = [
  ...TABS.filter((x) => x.mobile).slice(0, 2),
  { route: "home", label: "nav.home" },
  ...TABS.filter((x) => x.mobile).slice(2),
];

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICON[name]}
    </svg>
  );
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  // O apoio é por Pix (só no Brasil): o coração do topo aparece em pt-BR e só se a chave estiver configurada.
  const pix = pixConfig();
  const supportOn = lang === "pt-BR" && !!pix;
  const pixCode = useMemo(() => (pix ? pixPayload(pix) : ""), [pix?.key, pix?.name, pix?.city]); // eslint-disable-line react-hooks/exhaustive-deps
  const { route, params } = useRoute();
  const [toastMsg, setToastMsg] = useState("");
  const [installing, setInstalling] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [theming, setTheming] = useState(false);
  const inst = useInstall();
  const topRef = useRef<HTMLElement>(null);
  const [topHidden, setTopHidden] = useState(false);

  // Celular: o topo some ao rolar para baixo e volta ao subir. A altura dele vai para --toph, onde as abas
  // presas do álbum se encaixam logo abaixo.
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty("--toph", `${el.offsetHeight}px`));
    ro.observe(el);
    let last = scrollY;
    const on = () => {
      const y = scrollY;
      if (Math.abs(y - last) < 6) return;
      setTopHidden(y > last && y > 120);
      last = y;
    };
    addEventListener("scroll", on, { passive: true });
    return () => {
      ro.disconnect();
      removeEventListener("scroll", on);
    };
  }, []);
  useEffect(() => setTopHidden(false), [route]);

  useEffect(() => {
    if (!toastMsg) return;
    const id = setTimeout(() => setToastMsg(""), 3200);
    return () => clearTimeout(id);
  }, [toastMsg]);

  useEffect(() => {
    const done = () => setToastMsg(t("install.done"));
    addEventListener("appinstalled", done);
    return () => removeEventListener("appinstalled", done);
  }, [t]);

  const openInstall = useCallback(async () => {
    try {
      if (await inst.prompt()) setToastMsg(t("install.done"));
    } catch {
      setInstalling(true); // iPhone, ou navegador sem instalação direta: mostra o passo a passo
    }
  }, [inst, t]);

  const ui = useMemo<Ui>(
    () => ({ toast: setToastMsg, openInstall, openFeedback: () => setSuggesting(true), openTheme: () => setTheming(true), canInstall: !inst.installed }),
    [openInstall, inst.installed],
  );

  // As páginas secundárias acendem "Mais"; no celular, também as abas que só existem no topo (listas, história).
  // O enredo é o segundo modo da aba História.
  // A página inicial não é aba: nenhuma acende (o logo leva até ela).
  const activeTab: Route | null = route === "home" ? null : TABS.some((x) => x.route === route) ? route : route === "lore" ? "history" : "more";
  const activeMobile: Route = MOBILE_TABS.some((x) => x.route === route) ? route : "more";

  // Título da aba por página e por idioma (é o que aparece no histórico e no Google).
  useEffect(() => {
    const NAV: Record<Route, Parameters<typeof t>[0]> = {
      home: "app.tagline",
      sprites: "nav.sprites", shop: "nav.shop", cosmetics: "nav.cosmetics", lists: "nav.lists", leaks: "nav.leaks",
      tracks: "nav.tracks", map: "nav.map", news: "nav.news", season: "nav.season", history: "nav.history", lore: "nav.lore", islands: "nav.islands", free: "nav.free", support: "nav.support", more: "nav.more",
    };
    // Mesmo formato das páginas geradas no build (vite.config.ts), para o Google ver um título só.
    document.title = route === "home" ? `Lockerdex — ${t("app.tagline")}` : `${t(NAV[route])} · Fortnite — Lockerdex`;
  }, [route, t]);

  const page = (() => {
    switch (route) {
      case "shop":
        return <ShopPage />;
      case "cosmetics":
        return <CosmeticsPage key={params.get("q") ?? ""} initialQ={params.get("q") ?? ""} />;
      case "lists":
        return <ListsPage key={params.toString()} params={params} />;
      case "leaks":
        return <LeaksPage />;
      case "tracks":
        return <TracksPage />;
      case "map":
        return <MapPage />;
      case "news":
        return <NewsPage />;
      case "season":
        return <SeasonPage />;
      case "history":
        return <HistoryPage kind="history" />;
      case "lore":
        return <HistoryPage kind="lore" />;
      case "home":
        return <HomePage />;
      case "free":
        return <FreeGamesPage />;
      case "support":
        return <SupportPage />;
      case "islands":
        return <IslandsPage key={params.toString()} params={params} />;
      case "more":
        return <MorePage />;
      default:
        return <SpritesPage />;
    }
  })();

  return (
    <UiContext.Provider value={ui}>
      <div className={topHidden ? "app top-hidden" : "app"}>
        <header ref={topRef} className={`top${supportOn ? " top-support" : ""}${topHidden ? " top-hide" : ""}`}>
          <a className="brand" href={href("home")}>
            <AvatarBadge className="brand-av" />
            <span className="brand-tx">
              <span className="brand-w">
                LOCKER<span>DEX</span>
              </span>
              <span className="brand-t">{t("app.tagline")}</span>
            </span>
          </a>
          <nav className="nav-top" aria-label={t("nav.more")}>
            {TABS.map((x) => (
              <a key={x.route} href={href(x.route)} aria-current={activeTab === x.route ? "page" : undefined}>
                {t(x.label)}
              </a>
            ))}
          </nav>
          {supportOn && (
            <a className="btn-support" href={href("support")} aria-label={t("support.button")} title={t("support.button")} aria-current={route === "support" ? "page" : undefined}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.6 5 6 5c2.1 0 3.4 1.2 4 2.2.6-1 1.9-2.2 4-2.2 3.4 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21Z" />
              </svg>
            </a>
          )}
          {!inst.installed && (
            <button type="button" className="btn btn-install" onClick={openInstall} aria-label={t("install.button")} title={t("install.button")}>
              <span aria-hidden>⬇</span>
              <span className="btn-install-t">{t("install.button")}</span>
            </button>
          )}
          <button type="button" className="btn-theme" onClick={() => setTheming(true)} aria-label={t("theme.button")} title={t("theme.button")}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden>
              <path d="M12 3a9 9 0 0 0 0 18c1.2 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.2a1.7 1.7 0 0 1 1.3-2.9H16a5 5 0 0 0 5-5C21 6.3 17 3 12 3Z" />
              <circle cx="7.5" cy="11" r="1.3" fill="currentColor" stroke="none" />
              <circle cx="10.5" cy="7" r="1.3" fill="currentColor" stroke="none" />
              <circle cx="15.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <label className="lang">
            <span className="sr">{t("lang.label")}</span>
            <span className="lang-code" aria-hidden>
              {lang}
            </span>
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              {OFFERED.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </header>

        {/* Apoio por Pix: uma linha pequena em todas as páginas, logo abaixo do cabeçalho (menos na própria página de apoio). */}
        {/* No celular ela desce para o fim da página, para o topo ficar só com a marca; na página inicial fica em cima. */}
        {supportOn && pix && route !== "support" && (
          <div className={route === "home" ? "supbar-slot supbar-slot-top supbar-slot-home" : "supbar-slot supbar-slot-top"}>
            <SupportBar cfg={pix} code={pixCode} />
          </div>
        )}

        <main className={`page page-${route}`}>{page}</main>

        {supportOn && pix && route !== "support" && route !== "home" && (
          <div className="supbar-slot supbar-slot-end">
            <SupportBar cfg={pix} code={pixCode} />
          </div>
        )}

        {/* data-nosnippet: o Google usava o rodapé ("Funciona offline…") como texto do resultado, no lugar da descrição. */}
        <footer className="foot" data-nosnippet>
          {feedbackEnabled && (
            <div className="foot-fb">
              <p>{t("feedback.footer")}</p>
              <div className="foot-act">
                {!inst.installed && (
                  <button type="button" className="btn" onClick={openInstall}>
                    ⬇ {t("install.button")}
                  </button>
                )}
                <button type="button" className="btn btn-dust" onClick={() => setSuggesting(true)}>
                  {t("feedback.button")}
                </button>
              </div>
            </div>
          )}
          <p>{t("footer.offline")}</p>
          <p>{t("footer.data", { season: t("season.short", { chapter: CURRENT.chapter, season: CURRENT.season }) })}</p>
          <p>{t("footer.disclaimer")}</p>
        </footer>
      </div>

      <nav className="tabbar" aria-label={t("nav.more")}>
        {MOBILE_TABS.map((x) => (
          <a key={x.route} href={href(x.route)} aria-current={activeMobile === x.route ? "page" : undefined}>
            <Icon name={x.route} />
            <span>{t(x.label)}</span>
          </a>
        ))}
      </nav>

      <Walker />

      {installing && <InstallDialog ios={inst.ios} onClose={() => setInstalling(false)} />}
      {theming && <ThemeDialog onClose={() => setTheming(false)} />}
      {suggesting && (
        <FeedbackDialog season={t("season.short", { chapter: CURRENT.chapter, season: CURRENT.season })} onClose={() => setSuggesting(false)} toast={setToastMsg} />
      )}
      <div className="toast" role="status" aria-live="polite">
        {toastMsg && <p>{toastMsg}</p>}
      </div>
    </UiContext.Provider>
  );
}
