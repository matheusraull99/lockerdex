import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { SEASONS } from "./lib/data";
import { useI18n } from "./lib/i18n";
import { OFFERED } from "./lib/langs";
import { href, useRoute, type Route } from "./lib/router";
import { UiContext, type Ui } from "./lib/ui";
import { useInstall } from "./lib/pwa";
import { feedbackEnabled } from "./lib/feedback";
import { InstallDialog } from "./components/InstallDialog";
import { FeedbackDialog } from "./components/FeedbackDialog";
import { SpritesPage } from "./pages/SpritesPage";
import { ShopPage } from "./pages/ShopPage";
import { CosmeticsPage } from "./pages/CosmeticsPage";
import { ListsPage } from "./pages/ListsPage";
import { LeaksPage } from "./pages/LeaksPage";
import { TracksPage } from "./pages/TracksPage";
import { MapPage } from "./pages/MapPage";
import { NewsPage } from "./pages/NewsPage";
import { SeasonPage } from "./pages/SeasonPage";
import { MorePage } from "./pages/MorePage";

const CURRENT = SEASONS.find((s) => s.current) ?? SEASONS[0];

type NavKey = "nav.sprites" | "nav.shop" | "nav.cosmetics" | "nav.lists" | "nav.map" | "nav.more";

/** Ícones da barra de abas, desenhados no traço do app. */
const ICON: Record<string, ReactElement> = {
  sprites: <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm1 3v8h8V6H8Zm1 11h6" />,
  shop: <path d="M5 8h14l-1 12H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2" />,
  cosmetics: <path d="M12 3l2.2 5.6L20 9l-4.5 3.7L17 19l-5-3.2L7 19l1.5-6.3L4 9l5.8-.4L12 3Z" />,
  lists: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  map: <path d="M12 21s6-5.7 6-11a6 6 0 0 0-12 0c0 5.3 6 11 6 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="3.2" />,
};

const TABS: { route: Route; label: NavKey; mobile: boolean }[] = [
  { route: "sprites", label: "nav.sprites", mobile: true },
  { route: "shop", label: "nav.shop", mobile: true },
  { route: "cosmetics", label: "nav.cosmetics", mobile: true },
  { route: "lists", label: "nav.lists", mobile: false },
  { route: "map", label: "nav.map", mobile: true },
  { route: "more", label: "nav.more", mobile: true },
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
  const { route, params } = useRoute();
  const [toastMsg, setToastMsg] = useState("");
  const [installing, setInstalling] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const inst = useInstall();

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
    () => ({ toast: setToastMsg, openInstall, openFeedback: () => setSuggesting(true), canInstall: !inst.installed }),
    [openInstall, inst.installed],
  );

  // A aba "Minhas listas" fica dentro de "Mais" no celular; as páginas secundárias acendem "Mais".
  const activeTab: Route = TABS.some((x) => x.route === route) ? route : "more";

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
      case "more":
        return <MorePage />;
      default:
        return <SpritesPage />;
    }
  })();

  return (
    <UiContext.Provider value={ui}>
      <div className="app">
        <header className="top">
          <a className="brand" href={href("sprites")}>
            <span className="brand-w">
              LOCKER<span>DEX</span>
            </span>
            <span className="brand-t">{t("app.tagline")}</span>
          </a>
          <nav className="nav-top" aria-label={t("nav.more")}>
            {TABS.map((x) => (
              <a key={x.route} href={href(x.route)} aria-current={activeTab === x.route ? "page" : undefined}>
                {t(x.label)}
              </a>
            ))}
          </nav>
          <label className="lang">
            <span className="sr">{t("lang.label")}</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              {OFFERED.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </header>

        <main className={`page page-${route}`}>{page}</main>

        <footer className="foot">
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
        {TABS.filter((x) => x.mobile).map((x) => (
          <a key={x.route} href={href(x.route)} aria-current={activeTab === x.route || (x.route === "more" && route === "lists") ? "page" : undefined}>
            <Icon name={x.route} />
            <span>{t(x.label)}</span>
          </a>
        ))}
      </nav>

      {installing && <InstallDialog ios={inst.ios} onClose={() => setInstalling(false)} />}
      {suggesting && (
        <FeedbackDialog season={t("season.short", { chapter: CURRENT.chapter, season: CURRENT.season })} onClose={() => setSuggesting(false)} toast={setToastMsg} />
      )}
      <div className="toast" role="status" aria-live="polite">
        {toastMsg && <p>{toastMsg}</p>}
      </div>
    </UiContext.Provider>
  );
}
