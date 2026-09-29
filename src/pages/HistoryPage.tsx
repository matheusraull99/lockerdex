import { useEffect, useState, type CSSProperties } from "react";
import HISTORY from "../data/history.json";
import LORE from "../data/lore.json";
import { Loading } from "../components/Loading";
import { useI18n } from "../lib/i18n";
import { href } from "../lib/router";

/**
 * A aba História tem dois modos, com endereço próprio cada um:
 * - "history" (/history/): a linha do tempo do mundo real, com datas;
 * - "lore" (/lore/): o enredo dentro do jogo, marcado por temporada, com "Quem é quem" no fim.
 * Datas, temporadas e ordem ficam em data/<modo>.json (iguais para todos os idiomas); os textos, em
 * i18n/<modo>/<idioma>.json (carregados só aqui). O build (vite.config.ts) usa os mesmos arquivos
 * para a página pronta que o Google lê.
 */
export type HistoryKind = "history" | "lore";

export interface HistoryText {
  title: string;
  intro: string;
  chapters: string;
  eras: Record<string, string>;
  items: Record<string, { title: string; text: string }>;
  who?: { title: string; items: Record<string, { name: string; text: string }> };
  now: { title: string; text: string };
  sources: string;
}

interface Item {
  id: string;
  date?: string;
  season?: number | string;
}
interface Data {
  eras: { id: string; badge: string; color: string; chapter?: number; years?: string; items: Item[] }[];
  who?: { id: string; chapter: number; season: number | string }[];
}
const DATA: Record<HistoryKind, Data> = { history: HISTORY, lore: LORE };

const LOADERS: Record<HistoryKind, Record<string, () => Promise<{ default: HistoryText }>>> = {
  history: import.meta.glob<{ default: HistoryText }>("../i18n/history/*.json"),
  lore: import.meta.glob<{ default: HistoryText }>("../i18n/lore/*.json"),
};

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
  const who = en.who && { ...en.who, ...loc.who, items: { ...en.who.items, ...loc.who?.items } };
  return { ...en, ...loc, eras: { ...en.eras, ...loc.eras }, items: { ...en.items, ...loc.items }, who, now: loc.now ?? en.now };
}

/** Anos que a era cobre, pelas datas dos seus itens ("2017–2019"). */
function span(items: Item[]) {
  const first = items[0].date!.slice(0, 4);
  const last = items[items.length - 1].date!.slice(0, 4);
  return first === last ? first : `${first}–${last}`;
}

export function HistoryPage({ kind }: { kind: HistoryKind }) {
  const { t, lang } = useI18n();
  const [text, setText] = useState<HistoryText | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const data = DATA[kind];

  useEffect(() => {
    let alive = true;
    setText(null);
    setError(false);
    const loaders = LOADERS[kind];
    const en = `../i18n/${kind}/en.json`;
    const own = loaders[`../i18n/${kind}/${lang}.json`] ?? loaders[en];
    Promise.all([loaders[en](), own()])
      .then(([e, loc]) => alive && setText(merge(e.default, loc.default)))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [kind, lang, attempt]);

  // "C1 T4" (o mesmo rótulo curto do seletor de temporadas do álbum); temporadas com nome ficam "C4 OG".
  const when = (chapter: number | undefined, season: number | string | undefined) =>
    season === undefined || chapter === undefined ? "" : typeof season === "number" || season === "X" ? t("season.short", { chapter, season }) : `C${chapter} ${season}`;

  const modes = (
    <nav className="hist-switch" aria-label={t("nav.history")}>
      <a href={href("history")} aria-current={kind === "history" ? "page" : undefined}>
        {t("history.timeline")}
      </a>
      <a href={href("lore")} aria-current={kind === "lore" ? "page" : undefined}>
        {t("nav.lore")}
      </a>
    </nav>
  );

  if (!text)
    return (
      <>
        {modes}
        <Loading state={{ loading: !error, error, retry: () => setAttempt((n) => n + 1) }} />
      </>
    );

  return (
    <>
      {modes}
      <header className="page-h">
        <h1>{text.title}</h1>
      </header>
      <p className="hist-intro">{text.intro}</p>
      <nav aria-label={text.chapters}>
        <ul className="hist-jump">
          {data.eras.map((e) => (
            <li key={e.id}>
              <a href={`#${e.id}`} style={{ "--ec": e.color } as CSSProperties}>
                {text.eras[e.id]}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {data.eras.map((e) => (
        <section key={e.id} id={e.id} className="era" style={{ "--ec": e.color } as CSSProperties} aria-labelledby={`${e.id}-h`}>
          <header className="era-h">
            <span className="era-no" aria-hidden>
              {e.badge}
            </span>
            <h2 id={`${e.id}-h`}>
              {text.eras[e.id]}
              <small>{e.years ?? span(e.items)}</small>
            </h2>
          </header>
          <ol className="tl">
            {e.items.map((it) => {
              const x = text.items[it.id];
              if (!x) return null;
              return (
                <li key={it.id} className="tl-it">
                  {it.date ? <time dateTime={it.date}>{fmtWhen(lang, it.date)}</time> : <span className="tl-when">{when(e.chapter, it.season)}</span>}
                  <h3>{x.title}</h3>
                  <p>{x.text}</p>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

      {data.who && text.who && (
        <section className="who" aria-labelledby="who-h">
          <h2 id="who-h" className="sec-h">
            {text.who.title}
          </h2>
          <ul className="who-grid">
            {data.who.map((w) => {
              const x = text.who!.items[w.id];
              if (!x) return null;
              return (
                <li key={w.id}>
                  <b>{x.name}</b>
                  <small>{when(w.chapter, w.season)}</small>
                  <p>{x.text}</p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="hist-now">
        <h2>{text.now.title}</h2>
        <p>{text.now.text}</p>
        <div className="hist-cta">
          <a className="btn btn-dust" href={href("season")}>
            {t("nav.season")}
          </a>
          {kind === "history" ? (
            <a className="btn" href={href("lore")}>
              {t("nav.lore")}
            </a>
          ) : (
            <a className="btn" href={href("history")}>
              {t("history.timeline")}
            </a>
          )}
        </div>
      </section>
      <p className="note">{text.sources}</p>
    </>
  );
}
