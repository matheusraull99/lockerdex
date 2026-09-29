import { useEffect, useState, type CSSProperties } from "react";
import HISTORY from "../data/history.json";
import { Loading } from "../components/Loading";
import { useI18n } from "../lib/i18n";
import { href } from "../lib/router";

/**
 * Textos da história, um arquivo por idioma em i18n/history (carregado só nesta página).
 * As datas e a ordem ficam em data/history.json, iguais para todos os idiomas.
 * O build (vite.config.ts) usa os mesmos arquivos para a página pronta que o Google lê.
 */
export interface HistoryText {
  title: string;
  intro: string;
  chapters: string;
  eras: Record<string, string>;
  items: Record<string, { title: string; text: string }>;
  now: { title: string; text: string };
  sources: string;
}

const loaders = import.meta.glob<{ default: HistoryText }>("../i18n/history/*.json");
const EN = "../i18n/history/en.json";

/**
 * "2017-09-26", "2017-07" ou "2011", no formato do idioma. Sempre no calendário gregoriano:
 * em tailandês o padrão é o budista (2554), e aí a data não bateria com os anos do texto.
 */
export function fmtWhen(lang: string, date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const opts: Intl.DateTimeFormatOptions = d ? { day: "numeric", month: "long", year: "numeric" } : m ? { month: "long", year: "numeric" } : { year: "numeric" };
  return new Intl.DateTimeFormat(lang, { ...opts, calendar: "gregory", timeZone: "UTC" }).format(Date.UTC(y, (m || 1) - 1, d || 1));
}

/** Idioma incompleto: o que faltar vem do inglês. */
function merge(en: HistoryText, loc: HistoryText): HistoryText {
  return { ...en, ...loc, eras: { ...en.eras, ...loc.eras }, items: { ...en.items, ...loc.items }, now: loc.now ?? en.now };
}

/** Anos que a era cobre, pelas datas dos seus itens ("2017–2019"). */
function span(items: { date: string }[]) {
  const first = items[0].date.slice(0, 4);
  const last = items[items.length - 1].date.slice(0, 4);
  return first === last ? first : `${first}–${last}`;
}

export function HistoryPage() {
  const { t, lang } = useI18n();
  const [text, setText] = useState<HistoryText | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(false);
    const own = loaders[`../i18n/history/${lang}.json`] ?? loaders[EN];
    Promise.all([loaders[EN](), own()])
      .then(([en, loc]) => alive && setText(merge(en.default, loc.default)))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [lang, attempt]);

  if (!text) return <Loading state={{ loading: !error, error, retry: () => setAttempt((n) => n + 1) }} />;

  return (
    <>
      <header className="page-h">
        <h1>{text.title}</h1>
      </header>
      <p className="hist-intro">{text.intro}</p>
      <nav aria-label={text.chapters}>
        <ul className="hist-jump">
          {HISTORY.eras.map((e) => (
            <li key={e.id}>
              <a href={`#${e.id}`} style={{ "--ec": e.color } as CSSProperties}>
                {text.eras[e.id]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {HISTORY.eras.map((e) => (
        <section key={e.id} id={e.id} className="era" style={{ "--ec": e.color } as CSSProperties} aria-labelledby={`${e.id}-h`}>
          <header className="era-h">
            <span className="era-no" aria-hidden>
              {e.badge}
            </span>
            <h2 id={`${e.id}-h`}>
              {text.eras[e.id]}
              <small>{span(e.items)}</small>
            </h2>
          </header>
          <ol className="tl">
            {e.items.map((it) => {
              const x = text.items[it.id];
              if (!x) return null;
              return (
                <li key={it.id} className="tl-it">
                  <time dateTime={it.date}>{fmtWhen(lang, it.date)}</time>
                  <h3>{x.title}</h3>
                  <p>{x.text}</p>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      <section className="hist-now">
        <h2>{text.now.title}</h2>
        <p>{text.now.text}</p>
        <div className="hist-cta">
          <a className="btn btn-dust" href={href("season")}>
            {t("nav.season")}
          </a>
          <a className="btn" href={href("sprites")}>
            {t("nav.sprites")}
          </a>
        </div>
      </section>
      <p className="note">{text.sources}</p>
    </>
  );
}
