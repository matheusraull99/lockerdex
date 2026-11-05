import { useState } from "react";
import { useI18n } from "../lib/i18n";
import { APP_NEWS } from "../lib/appNews";

const SHOWN = 3;
const NEW_DAYS = 7;

/** Quadro "Novidades do Lockerdex" na página inicial: as 3 mais recentes, e o resto ao tocar em "Ver todas". */
export function AppNews() {
  const { t, lang } = useI18n();
  const [all, setAll] = useState(false);
  const pt = lang === "pt-BR" || lang === "pt-PT";
  const fmt = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", calendar: "gregory", timeZone: "UTC" });
  const list = all ? APP_NEWS : APP_NEWS.slice(0, SHOWN);
  return (
    <section className="appnews" aria-labelledby="appnews-h" data-nosnippet>
      <h2 id="appnews-h" className="appnews-h">
        {t("appnews.title")}
      </h2>
      <ol className="appnews-list">
        {list.map((n) => {
          const [title, desc] = pt ? n.pt : n.en;
          const at = Date.parse(`${n.date}T12:00:00Z`);
          const fresh = Date.now() - at < NEW_DAYS * 86400_000;
          return (
            <li key={n.date + title}>
              <p className="appnews-when">
                {fmt.format(at)}
                {fresh && <span className="tag tag-new">{t("appnews.new")}</span>}
              </p>
              <h3>{title}</h3>
              <p className="appnews-desc">{desc}</p>
            </li>
          );
        })}
      </ol>
      {APP_NEWS.length > SHOWN && (
        <button type="button" className="btn btn-quiet appnews-more" onClick={() => setAll((v) => !v)} aria-expanded={all}>
          {all ? t("appnews.less") : `${t("appnews.more")} (${APP_NEWS.length})`}
        </button>
      )}
    </section>
  );
}
