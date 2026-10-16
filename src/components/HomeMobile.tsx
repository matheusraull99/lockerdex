import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { SEASONS, hideBroken, imgUrl } from "../lib/data";
import { storage } from "../lib/collection";
import { useI18n } from "../lib/i18n";
import { href } from "../lib/router";
import { relTime, SEASON_END } from "../lib/ui";
import { spriteText } from "../lib/content";
import { weeklyEvents } from "../lib/weekly";
import { useFreeGames } from "../lib/freeGames";
import { useApi, type Shop } from "../lib/api";
import { entryView } from "../pages/ShopPage";
import { Ring, closest } from "./Ring";

/*
 * Capa da página inicial no celular (10/2026): o seu álbum primeiro, a contagem da temporada numa linha só
 * e as fichas de "Hoje no Fortnite". O destaque da loja e as fileiras continuam vindo do HomeFeature.
 */

const CURRENT = SEASONS.find((s) => s.current) ?? SEASONS[0];

function useNow(ms: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** Cartão do seu álbum: anel de progresso, o elemental mais perto de fechar e as figurinhas dele. */
export function MyAlbumCard() {
  const { L, t, nf } = useI18n();
  const collection = useMemo(() => storage.load(), []);
  const slots = CURRENT.slots.filter((s) => !s.unreleased);
  const owned = slots.filter((s) => (collection[s.id] ?? 0) > 0).length;
  const next = closest(CURRENT, collection, false);
  const show = (next?.sprite ?? CURRENT.sprites[0]).slots.filter((s) => !s.unreleased).slice(0, 7);
  return (
    <a className="mine" href={href("sprites")}>
      <Ring owned={owned} total={slots.length} next={null} hint="" />
      <span className="mine-tx">
        <b className="mine-h">
          {t("home.mine")} {t("season.short", { chapter: CURRENT.chapter, season: CURRENT.season })}
        </b>
        <span className="mine-next">
          {next ? t("album.next", { name: spriteText(L, next.sprite.key).name, owned: nf(next.owned), total: nf(next.total) }) : t("sticker.hint")}
        </span>
        <span className="mine-stk" aria-hidden>
          {show.map((s) => (
            <img key={s.id} src={imgUrl(s.img)} alt="" loading="lazy" data-rarity={s.sprite.rarity} data-on={(collection[s.id] ?? 0) > 0 || undefined} onError={hideBroken} />
          ))}
        </span>
      </span>
      <span className="mine-go" aria-hidden>
        →
      </span>
    </a>
  );
}

/** A temporada acaba em 15d 15h 41min, numa linha só. */
export function SeasonStrip() {
  const { t, lang } = useI18n();
  const now = useNow(30_000);
  const left = Math.max(0, Date.parse(SEASON_END) - now);
  const unit = (n: number, u: "day" | "hour" | "minute") =>
    new Intl.NumberFormat(lang, { style: "unit", unit: u, unitDisplay: "narrow" }).formatToParts(n).map((p) => (p.type === "unit" ? <small key={p.type}>{p.value}</small> : p.value));
  return (
    <a className="strip" href={href("season")}>
      <span className="strip-dot" aria-hidden />
      <span className="strip-lab">{t("home.endsIn", { season: t("season.short", { chapter: CURRENT.chapter, season: CURRENT.season }) })}</span>
      <span className="strip-tm" role="timer">
        {unit(Math.floor(left / 86400000), "day")} {unit(Math.floor(left / 3600000) % 24, "hour")} {unit(Math.floor(left / 60000) % 60, "minute")}
      </span>
    </a>
  );
}

/** Fichas de hoje: evento, Horas do Poder, troca da loja, jogos grátis e elemental novo de quinta. */
export function TodayChips() {
  const { t, lang } = useI18n();
  const now = useNow(60_000);
  const shop = useApi<Shop>("/v2/shop", lang);
  const free = useFreeGames(lang);
  const day = new Intl.DateTimeFormat(lang, { weekday: "long" });
  const time = new Intl.DateTimeFormat(lang, { hour: "numeric", minute: "2-digit" });
  const list = new Intl.ListFormat(lang, { type: "conjunction" });
  const dm = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", calendar: "gregory" });
  const ev = weeklyEvents(now);
  const n = new Date(now);
  const shopNext = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1); // a loja troca às 00:00 UTC
  // o mesmo pacotão do primeiro destaque: o maior da primeira seção da loja
  const top = shop.data?.entries
    .filter((e) => /Size_[34]_x_1/.test(e.tileSize ?? "") && (e.bundle || e.brItems?.length))
    .sort((a, b) => (a.layout?.index ?? 999) - (b.layout?.index ?? 999) || (b.layout?.rank ?? 0) - (a.layout?.rank ?? 0))[0];

  const chips: { key: string; c: string; eyebrow: string; title: string; sub: string; live?: boolean; to: string }[] = [];
  const fm = ev.find((e) => e.key === "fm");
  if (fm) {
    const w = fm.windows[0];
    chips.push({ key: "fm", c: "var(--legendary)", eyebrow: t("home.event"), title: t("week.fm.name"), sub: fm.active ? `${t("week.now")} · ${dm.formatRange(w.start, w.end)}` : t("week.starts", { time: relTime(lang, w.start, now) }), live: fm.active, to: href("sprites") });
  }
  const sat = ev.find((e) => e.key === "sat");
  if (sat?.windows.length) {
    const ws = sat.windows.filter((w) => new Date(w.start).toDateString() === new Date(sat.windows[0].start).toDateString());
    chips.push({ key: "sat", c: "var(--epic)", eyebrow: day.format(ws[0].start), title: t("week.sat.name"), sub: sat.active ? t("week.now") : list.format(ws.map((w) => time.format(w.start))), live: sat.active, to: href("sprites") });
  }
  chips.push({ key: "shop", c: "var(--dust)", eyebrow: t("nav.shop"), title: t("home.shopIn", { time: relTime(lang, shopNext, now) }), sub: top ? entryView(top).name : t("home.shopEyebrow"), to: href("shop") });
  if (free.current.length) {
    const g = free.current[0];
    chips.push({ key: "free", c: "var(--rare)", eyebrow: t("home.freeEyebrow"), title: free.current.map((x) => x.title).filter(Boolean).join(" + ") || t("free.mystery"), sub: t("free.ends", { time: relTime(lang, Date.parse(g.end), now) }), to: href("free") });
  }
  const thu = ev.find((e) => e.key === "thu");
  if (thu?.active) chips.push({ key: "thu", c: "var(--mythic)", eyebrow: t("week.today"), title: t("week.thu.name"), sub: t("week.thu.desc"), live: true, to: href("sprites") });

  return (
    <section className="today" aria-labelledby="today-h" data-nosnippet>
      <h2 id="today-h" className="today-h">
        {t("home.today")}
      </h2>
      <ul className="today-list">
        {chips.map((c) => (
          <li key={c.key}>
            <a className="chip-day" href={c.to} style={{ "--c": c.c } as CSSProperties}>
              <small>{c.eyebrow}</small>
              <b>{c.title}</b>
              <span data-live={c.live || undefined}>{c.sub}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
