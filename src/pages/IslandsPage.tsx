import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "../lib/i18n";
import { go, href } from "../lib/router";
import { useUi } from "../lib/ui";
import {
  lastValue,
  normalizeCode,
  officialUrl,
  useEco,
  utcDaysAgo,
  type Genre,
  type GenreRanking,
  type Island,
  type IslandMetrics,
  type IslandRankings,
  type Point,
} from "../lib/islands";
import { Loading } from "../components/Loading";
import { PeakChart } from "../components/PeakChart";

type UiKey = Parameters<ReturnType<typeof useI18n>["t"]>[0];

const GENRE_DEFAULT = "battle-royale";
const PAGE = 10;

/** Nome do gênero no idioma do app; gênero novo que a Epic criar cai no nome em inglês da API. */
function useGenreName() {
  const { t } = useI18n();
  return (g: { slug: string; displayName: string }) => {
    const key = `islands.genre.${g.slug}` as UiKey;
    const s = t(key);
    return s === key ? g.displayName : s;
  };
}

export function IslandsPage({ params }: { params: URLSearchParams }) {
  const { t } = useI18n();
  const code = params.get("code");
  return (
    <>
      <header className="page-h">
        <h1>{t("nav.islands")}</h1>
        <p>{t("more.islands")}</p>
      </header>
      <CodeSearch initial={code ?? ""} />
      {code ? <IslandCard code={code} /> : <Overview genre={params.get("genre") ?? GENRE_DEFAULT} />}
      <p className="note src">{t("islands.note")}</p>
    </>
  );
}

function CodeSearch({ initial }: { initial: string }) {
  const { t } = useI18n();
  const [q, setQ] = useState(initial);
  const [bad, setBad] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const c = normalizeCode(q);
    setBad(!c);
    if (c) go("islands", { code: c });
  };
  return (
    <form className="tools isl-search" role="search" onSubmit={submit}>
      <input
        className="search"
        type="search"
        inputMode="text"
        autoComplete="off"
        value={q}
        placeholder={t("islands.search")}
        aria-label={t("islands.search")}
        aria-invalid={bad || undefined}
        onChange={(e) => (setQ(e.target.value), setBad(false))}
      />
      <button type="submit" className="btn btn-dust">
        {t("islands.go")}
      </button>
      {bad && (
        <p className="isl-bad" role="alert">
          {t("islands.invalid")}
        </p>
      )}
    </form>
  );
}

/* ---------- sem código: Fortnite agora + ranking por gênero ---------- */

function Overview({ genre }: { genre: string }) {
  const { t, nf } = useI18n();
  const hour = useEco<{ inMatchPeakCCU: Point[] }>("/metrics/hour");
  const day = useEco<{ intervals: Point[] }>("/metrics/day/in-client-peak-ccu");
  const now = lastValue(hour.data?.inMatchPeakCCU);
  const today = lastValue(day.data?.intervals);

  return (
    <>
      <section className="isl-now">
        <h2 className="sec-h">{t("islands.now")}</h2>
        {hour.data ? (
          <>
            <div className="isl-hero">
              <b>{now != null ? nf(now) : "—"}</b>
              <span>{t("islands.nowNote")}</span>
              {today != null && <small>{t("islands.peakDay", { n: nf(today) })}</small>}
            </div>
            <PeakChart points={hour.data.inMatchPeakCCU} label={t("islands.chart24")} />
          </>
        ) : (
          <Loading state={hour} />
        )}
      </section>
      <Ranking genre={genre} />
    </>
  );
}

function Ranking({ genre }: { genre: string }) {
  const { t, nf } = useI18n();
  const name = useGenreName();
  const [size, setSize] = useState(PAGE);
  const genres = useEco<{ data: Genre[] }>("/genres");
  const rank = useEco<GenreRanking>(`/genres/${encodeURIComponent(genre)}/rankings?size=${size}`);
  const list = genres.data?.data ?? [];

  return (
    <section className="isl-rank">
      <h2 className="sec-h">{t("islands.top")}</h2>
      <div className="tools">
        <select
          value={genre}
          aria-label={t("islands.genre")}
          onChange={(e) => (setSize(PAGE), go("islands", e.target.value === GENRE_DEFAULT ? {} : { genre: e.target.value }))}
        >
          {list.length === 0 && <option value={genre}>{genre}</option>}
          {[...list]
            .sort((a, b) => name(a).localeCompare(name(b)))
            .map((g) => (
              <option key={g.slug} value={g.slug}>
                {name(g)}
              </option>
            ))}
        </select>
        {rank.data && <span className="isl-total">{t("islands.inGenre", { n: nf(rank.data.meta.total) })}</span>}
      </div>
      {!rank.data ? (
        <Loading state={rank} />
      ) : (
        <>
          <ol className="isl-list">
            {rank.data.data.map((r) => (
              <RankRow key={r.islandCode} code={r.islandCode} rank={r.rank} />
            ))}
          </ol>
          {rank.data.meta.total > size && size < 100 && (
            <div className="more-row">
              <button type="button" className="btn" onClick={() => setSize((s) => s + PAGE)}>
                {t("common.showMore")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function RankRow({ code, rank }: { code: string; rank: number }) {
  const { t, nf } = useI18n();
  const isl = useEco<Island>(`/islands/${code}`);
  const ccu = useEco<{ intervals: Point[] }>(`/islands/${code}/metrics/hour/peak-ccu`);
  const now = lastValue(ccu.data?.intervals);
  return (
    <li>
      <a href={href("islands", { code })}>
        <span className="isl-pos">{rank}</span>
        <span className="tr-main">
          <b>{isl.data?.title ?? code}</b>
          <small>
            {isl.data ? `${t("islands.by", { creator: isl.data.creatorCode })} · ` : ""}
            {code}
          </small>
        </span>
        {now != null && <span className="isl-ccu">{t("islands.playersNow", { n: nf(now) })}</span>}
      </a>
    </li>
  );
}

/* ---------- ficha de uma ilha ---------- */

const STATS: { key: Exclude<keyof IslandMetrics, "retention" | "minutesPlayed">; label: UiKey; dec?: boolean }[] = [
  { key: "uniquePlayers", label: "islands.stat.uniquePlayers" },
  { key: "plays", label: "islands.stat.plays" },
  { key: "peakCCU", label: "islands.stat.peakCCU" },
  { key: "averageMinutesPerPlayer", label: "islands.stat.avgMinutes", dec: true },
  { key: "favorites", label: "islands.stat.favorites" },
  { key: "recommendations", label: "islands.stat.recommendations" },
];

function IslandCard({ code }: { code: string }) {
  const { t, lang, nf } = useI18n();
  const { toast } = useUi();
  const name = useGenreName();
  const path = `/islands/${encodeURIComponent(code)}`;
  const isl = useEco<Island>(path);
  // Dias completos da última semana (o de hoje ainda está correndo) e as últimas 24 horas.
  const days = useEco<IslandMetrics>(isl.data ? `${path}/metrics/day?from=${encodeURIComponent(utcDaysAgo(6))}` : null);
  const hours = useEco<{ intervals: Point[] }>(isl.data ? `${path}/metrics/hour/peak-ccu` : null);
  const ranks = useEco<IslandRankings>(isl.data ? `${path}/rankings` : null);

  useEffect(() => {
    if (isl.data) document.title = `${isl.data.title} · ${t("nav.islands")} — Lockerdex`;
  }, [isl.data, t]);

  if (!isl.data) {
    if (isl.status === 404 || isl.status === 400)
      return (
        <div className="empty" role="alert">
          <p>{t("islands.notFound")}</p>
          <a className="btn" href={href("islands")}>
            {t("islands.back")}
          </a>
        </div>
      );
    return <Loading state={isl} />;
  }

  const i = isl.data;
  const shown = i.displayName ?? i.code;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(i.code.includes("-") ? i.code : shown);
      toast(t("islands.copied", { code: shown }));
    } catch {
      toast(shown);
    }
  };

  // Último dia já fechado em UTC.
  const todayUtc = utcDaysAgo(0);
  const idx = (pts?: { timestamp: string }[]) => {
    if (!pts) return -1;
    for (let k = pts.length - 1; k >= 0; k--) if (pts[k].timestamp < todayUtc) return k;
    return -1;
  };
  const m = days.data;
  const k = idx(m?.uniquePlayers);
  const dayLabel = m && k >= 0 ? new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(m.uniquePlayers[k].timestamp)) : "";
  const d1 = m && k >= 0 ? m.retention[idx(m.retention)]?.d1 : null;
  const genreRanks = ranks.data?.data.at(-1)?.genres ?? [];
  const noData = m && k >= 0 && m.uniquePlayers[k].value == null;

  return (
    <article className="isl-card">
      <header className="isl-head">
        <div>
          <h2>{i.title}</h2>
          <p>
            {t("islands.by", { creator: i.creatorCode })} · <code>{shown}</code>
          </p>
          {(i.tags?.length || i.category) && (
            <ul className="isl-tags">
              {i.category && <li className="tag tag-dark">{i.category}</li>}
              {i.tags?.map((x) => (
                <li key={x} className="tag">
                  {x}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="isl-act">
          <button type="button" className="btn btn-dust" onClick={copy}>
            {t("islands.copy")}
          </button>
          <a className="btn" href={officialUrl(i)} target="_blank" rel="noopener">
            {t("islands.official")} ↗
          </a>
        </div>
      </header>

      {genreRanks.length > 0 && (
        <ul className="isl-ranks">
          {genreRanks.map((g) => (
            <li key={g.genreSlug}>
              <a href={href("islands", g.genreSlug === GENRE_DEFAULT ? {} : { genre: g.genreSlug })}>
                {t("islands.rankIn", { rank: nf(g.rank), genre: name({ slug: g.genreSlug, displayName: g.genre }) })}
              </a>
            </li>
          ))}
        </ul>
      )}

      {!m ? (
        <Loading state={days} />
      ) : noData || k < 0 ? (
        <p className="note">{t("islands.noData")}</p>
      ) : (
        <section>
          <h3 className="isl-day">{t("islands.lastDay", { date: dayLabel })}</h3>
          <dl className="isl-stats">
            {STATS.map((s) => {
              const v = m[s.key][k]?.value;
              return (
                <div key={s.key}>
                  <dt>{t(s.label)}</dt>
                  <dd>{v == null ? "—" : s.dec ? v.toLocaleString(lang, { maximumFractionDigits: 1 }) : nf(v)}</dd>
                </div>
              );
            })}
            <div>
              <dt>{t("islands.stat.retention")}</dt>
              <dd>{d1 == null ? "—" : `${Math.round(d1 * 100)}%`}</dd>
            </div>
          </dl>
        </section>
      )}

      {hours.data && <PeakChart points={hours.data.intervals} label={t("islands.chart24island")} />}

      <p className="isl-back">
        <a href={href("islands")}>← {t("islands.back")}</a>
      </p>
    </article>
  );
}

