import { useI18n } from "../lib/i18n";
import { OFFERED } from "../lib/langs";
import { href, type Route } from "../lib/router";
import { feedbackEnabled } from "../lib/feedback";
import { useUi } from "../lib/ui";

type UiKey = Parameters<ReturnType<typeof useI18n>["t"]>[0];

const GROUPS: { title: UiKey; items: { route: Route; params?: Record<string, string>; label: UiKey; desc: UiKey; icon: string }[] }[] = [
  {
    title: "more.collection",
    items: [
      { route: "sprites", label: "nav.sprites", desc: "more.sprites", icon: "▦" },
      { route: "lists", label: "nav.wishlist", desc: "more.wishlist", icon: "♥" },
      { route: "lists", params: { tab: "own" }, label: "nav.locker", desc: "more.locker", icon: "✓" },
    ],
  },
  {
    title: "more.items",
    items: [
      { route: "shop", label: "nav.shop", desc: "more.shop", icon: "◈" },
      { route: "cosmetics", label: "nav.cosmetics", desc: "more.cosmetics", icon: "✦" },
      { route: "leaks", label: "nav.leaks", desc: "more.leaks", icon: "◎" },
      { route: "tracks", label: "nav.tracks", desc: "more.tracks", icon: "♫" },
    ],
  },
  {
    title: "more.game",
    items: [
      { route: "map", label: "nav.map", desc: "more.map", icon: "⌖" },
      { route: "news", label: "nav.news", desc: "more.news", icon: "✉" },
      { route: "season", label: "nav.season", desc: "more.season", icon: "◷" },
    ],
  },
];

export function MorePage() {
  const { t, lang, setLang } = useI18n();
  const { openInstall, openFeedback, canInstall } = useUi();
  return (
    <>
      <header className="page-h">
        <h1>{t("nav.more")}</h1>
      </header>
      {GROUPS.map((g) => (
        <section key={g.title} className="more-sec">
          <h2 className="sec-h">{t(g.title)}</h2>
          <ul className="more-grid">
            {g.items.map((it) => (
              <li key={it.label}>
                <a href={href(it.route, it.params)}>
                  <span className="more-ic" aria-hidden>
                    {it.icon}
                  </span>
                  <span>
                    <b>{t(it.label)}</b>
                    <small>{t(it.desc)}</small>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className="more-sec">
        <h2 className="sec-h">{t("more.app")}</h2>
        <div className="more-app">
          {canInstall && (
            <button type="button" className="btn btn-dust" onClick={openInstall}>
              ⬇ {t("install.button")}
            </button>
          )}
          {feedbackEnabled && (
            <button type="button" className="btn" onClick={openFeedback}>
              ✎ {t("feedback.button")}
            </button>
          )}
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
        </div>
      </section>
    </>
  );
}
