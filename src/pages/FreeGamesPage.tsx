import { useI18n } from "../lib/i18n";
import { useFreeGames, type FreeView } from "../lib/freeGames";
import { relTime } from "../lib/ui";
import { hideBroken } from "../lib/data";
import { Loading } from "../components/Loading";

export function FreeGamesPage() {
  const { t, lang } = useI18n();
  const free = useFreeGames(lang);

  if (free.loading || free.error) return <Loading state={free} />;

  return (
    <>
      <header className="page-h">
        <h1>{t("nav.free")}</h1>
        <p>{t("more.free")}</p>
      </header>

      <section className="fg-sec">
        <h2 className="sec-h">{t("free.now")}</h2>
        {free.current.length ? (
          <ul className="fg-grid">
            {free.current.map((g) => (
              <GameCard key={g.id} g={g} live />
            ))}
          </ul>
        ) : (
          <p className="note">{t("free.empty")}</p>
        )}
      </section>

      {free.upcoming.length > 0 && (
        <section className="fg-sec">
          <h2 className="sec-h">{t("free.next")}</h2>
          <ul className="fg-grid fg-next">
            {free.upcoming.map((g) => (
              <GameCard key={g.id} g={g} />
            ))}
          </ul>
        </section>
      )}

      <p className="note src">{t("free.note")}</p>
    </>
  );

  function GameCard({ g, live = false }: { g: FreeView; live?: boolean }) {
    const date = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const when = live ? Date.parse(g.end) : Date.parse(g.start);
    return (
      <li className="fg-card" data-live={live || undefined}>
        <a className="fg-art" href={g.url} target="_blank" rel="noopener" tabIndex={-1} aria-hidden>
          {g.wide && <img src={g.wide} alt="" loading="lazy" decoding="async" onError={hideBroken} />}
        </a>
        <div className="fg-body">
          <p className="fg-when">
            <span className="fg-badge">{live ? t("free.free") : t("free.soon")}</span>
            <span>
              {live ? t("free.ends", { time: relTime(lang, when) }) : t("free.starts", { time: relTime(lang, when) })}
              {" · "}
              <time dateTime={live ? g.end : g.start}>{date.format(when)}</time>
            </span>
          </p>
          <h3>{g.title || t("free.mystery")}</h3>
          {g.seller && <p className="fg-seller">{g.seller}</p>}
          {g.desc && <p className="fg-desc">{g.desc}</p>}
          <div className="fg-act">
            {g.price && (
              <span className="fg-price">
                <s>{g.price}</s> <b>{t("free.free")}</b>
              </span>
            )}
            <a className={live ? "btn btn-fn" : "btn"} href={g.url} target="_blank" rel="noopener">
              {live ? t("free.claim") : t("free.see")} ↗
            </a>
          </div>
        </div>
      </li>
    );
  }
}
