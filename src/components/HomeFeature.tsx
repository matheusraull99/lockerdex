import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useApi, type MapData, type NewsMotd, type Shop, type ShopEntry } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { lastValue, useEco, type GenreRanking, type Island, type Point } from "../lib/islands";
import { href } from "../lib/router";
import { relTime } from "../lib/ui";
import { entryView } from "../pages/ShopPage";
import { hideBroken } from "../lib/data";
import { IslandArt } from "./IslandArt";
import { useFreeGames } from "../lib/freeGames";

/*
 * Topo da página inicial no estilo do fortnite.com: destaques grandes que se revezam e fileiras que rolam para o lado.
 * Assinatura: o destaque da loja pega as cores que a própria Epic deu ao item (entry.colors), então muda todo dia.
 */

const ROTATE_MS = 7000;
const hex = (c?: string) => (c && /^[0-9a-f]{6}/i.test(c) ? `#${c.slice(0, 6)}` : undefined);
const tint = (e: ShopEntry) => ({ "--c1": hex(e.colors?.color1) ?? "#3b2a8f", "--c2": hex(e.colors?.color3) ?? hex(e.colors?.color2) ?? "#140f2e" }) as CSSProperties;

type Slide = { key: string; eyebrow: string; title: string; sub?: string; cta: string; to: string; art?: string; bg?: string; style?: CSSProperties; kind: "shop" | "now" | "news" | "free" };

/** Ofertas grandes da loja, uma por seção, na ordem em que a Epic mostra as seções. */
function featured(entries: ShopEntry[]) {
  const big = entries
    .filter((e) => /Size_[34]_x_1/.test(e.tileSize ?? "") && (e.bundle || e.brItems?.length))
    .sort((a, b) => (a.layout?.index ?? 999) - (b.layout?.index ?? 999) || (b.layout?.rank ?? 0) - (a.layout?.rank ?? 0));
  const seen = new Set<string>();
  return big.filter((e) => !seen.has(e.layout?.id ?? e.offerId) && !!seen.add(e.layout?.id ?? e.offerId));
}

export function HomeFeature() {
  const { t, lang, nf } = useI18n();
  const shop = useApi<Shop>("/v2/shop", lang);
  const news = useApi<{ motds?: NewsMotd[] }>("/v2/news/br", lang);
  const map = useApi<MapData>("/v1/map", lang);
  const now = useEco<{ inMatchPeakCCU: Point[] }>("/metrics/hour");
  const players = lastValue(now.data?.inMatchPeakCCU);
  const free = useFreeGames(lang);
  const freeNow = free.current[0];

  const slides = useMemo(() => {
    const out: Slide[] = [];
    const feat = featured(shop.data?.entries ?? []);
    for (const e of feat.slice(0, 2)) {
      const v = entryView(e);
      out.push({ key: e.offerId, kind: "shop", eyebrow: t("home.shopEyebrow"), title: v.name, sub: e.layout?.name?.trim(), cta: t("home.shopCta"), to: href("shop"), art: v.image, style: tint(e) });
    }
    if (players != null)
      out.push({ key: "now", kind: "now", eyebrow: t("islands.now"), title: nf(players), sub: t("islands.nowNote"), cta: t("home.nowCta"), to: href("islands"), bg: map.data?.images.blank });
    if (freeNow)
      out.push({ key: `free-${freeNow.id}`, kind: "free", eyebrow: t("home.freeEyebrow"), title: free.current.map((g) => g.title).join(" + "), sub: t("free.ends", { time: relTime(lang, Date.parse(freeNow.end)) }), cta: t("home.freeCta"), to: href("free"), bg: freeNow.wide ?? undefined });
    const m = news.data?.motds?.[0];
    if (m) out.push({ key: m.id, kind: "news", eyebrow: t("home.newsEyebrow"), title: m.title, sub: m.body, cta: t("home.newsCta"), to: href("news"), bg: m.image });
    return out;
  }, [shop.data, news.data, map.data, players, free.current.length, freeNow?.id, t, nf, lang]);

  const [cur, setCur] = useState(0);
  const [paused, setPaused] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [hold, setHold] = useState(false); // mouse ou foco dentro: não troca embaixo da pessoa
  const n = slides.length;
  const at = n ? cur % n : 0;

  useEffect(() => {
    if (paused || hold || n < 2) return;
    const id = setTimeout(() => setCur((c) => (c + 1) % n), ROTATE_MS);
    return () => clearTimeout(id);
  }, [cur, paused, hold, n]);

  return (
    <>
      {n > 0 && (
        <section
          className="fn-hero"
          aria-roledescription="carousel"
          aria-label={t("home.carousel")}
          onMouseEnter={() => setHold(true)}
          onMouseLeave={() => setHold(false)}
          onFocus={() => setHold(true)}
          onBlur={() => setHold(false)}
        >
          {slides.map((s, i) => (
            <article
              key={s.key}
              className="fn-slide"
              data-kind={s.kind}
              data-on={i === at || undefined}
              aria-hidden={i !== at}
              aria-roledescription="slide"
              aria-label={t("home.goTo", { n: i + 1, total: n })}
              style={s.style}
            >
              {s.bg && <img className="fn-bg" src={s.bg} alt="" onError={hideBroken} />}
              {s.art && <img className="fn-art" src={s.art} alt="" onError={hideBroken} />}
              <div className="fn-copy">
                <p className="fn-eyebrow">{s.eyebrow}</p>
                <h2>{s.title}</h2>
                {s.sub && <p className="fn-sub">{s.sub}</p>}
                <a className="btn btn-fn" href={s.to} tabIndex={i === at ? 0 : -1}>
                  {s.cta}
                </a>
              </div>
            </article>
          ))}
          {n > 1 && (
            <div className="fn-ctl">
              {slides.map((s, i) => (
                <button key={s.key} type="button" className="fn-dot" aria-current={i === at || undefined} aria-label={t("home.goTo", { n: i + 1, total: n })} onClick={() => setCur(i)} />
              ))}
              <button type="button" className="fn-pause" aria-pressed={paused} aria-label={paused ? t("home.play") : t("home.pause")} onClick={() => setPaused((p) => !p)}>
                {paused ? "▶" : "❚❚"}
              </button>
            </div>
          )}
        </section>
      )}
      <ShopRow shop={shop.data} />
      <TrendingRow />
    </>
  );
}

function ShopRow({ shop }: { shop?: Shop }) {
  const { t, nf } = useI18n();
  const items = useMemo(() => {
    const e = [...(shop?.entries ?? [])].filter((x) => x.brItems?.length || x.bundle);
    e.sort((a, b) => (a.layout?.index ?? 999) - (b.layout?.index ?? 999) || (b.layout?.rank ?? 0) - (a.layout?.rank ?? 0));
    return e.slice(0, 16);
  }, [shop]);
  if (!shop || !items.length) return null;
  return (
    <section className="fn-row">
      <header>
        <h2>{t("home.shopEyebrow")}</h2>
        <a href={href("shop")}>{t("home.seeAll")} <span className="fn-arrow" aria-hidden>→</span></a>
      </header>
      <ul className="fn-scroll">
        {items.map((e) => {
          const v = entryView(e);
          return (
            <li key={e.offerId}>
              <a className="fn-card" href={href("shop")} style={tint(e)}>
                <img src={v.image} alt="" loading="lazy" decoding="async" onError={hideBroken} />
                <span className="fn-card-tx">
                  <b>{v.name}</b>
                  <span className="price">
                    <img src={shop.vbuckIcon} alt="V-Bucks" width="14" height="14" />
                    {nf(e.finalPrice)}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TrendingRow() {
  const { t } = useI18n();
  const rank = useEco<GenreRanking>("/genres/battle-royale/rankings?size=10");
  if (!rank.data?.data.length) return null;
  return (
    <section className="fn-row">
      <header>
        <h2>{t("home.trending")}</h2>
        <a href={href("islands")}>{t("home.seeAll")} <span className="fn-arrow" aria-hidden>→</span></a>
      </header>
      <ol className="fn-scroll">
        {rank.data.data.map((r) => (
          <IslandCard key={r.islandCode} code={r.islandCode} rank={r.rank} />
        ))}
      </ol>
    </section>
  );
}

function IslandCard({ code, rank }: { code: string; rank: number }) {
  const { t, nf } = useI18n();
  const isl = useEco<Island>(`/islands/${code}`);
  const ccu = useEco<{ intervals: Point[] }>(`/islands/${code}/metrics/hour/peak-ccu`);
  const now = lastValue(ccu.data?.intervals);
  return (
    <li>
      <a className="fn-isl" href={href("islands", { code })}>
        <IslandArt code={code} />
        <span className="fn-isl-pos">{rank}</span>
        <b>{isl.data?.title ?? code}</b>
        <small>{isl.data ? t("islands.by", { creator: isl.data.creatorCode }) : code}</small>
        {now != null && <span className="fn-isl-ccu">{t("islands.playersNow", { n: nf(now) })}</span>}
      </a>
    </li>
  );
}
