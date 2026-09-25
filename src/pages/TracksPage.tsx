import { useMemo, useState } from "react";
import { hideBroken } from "../lib/data";
import { useApi, type ApiTrack, type Shop } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Loading } from "../components/Loading";

type Sort = "new" | "az" | "artist" | "year";
const PAGE = 50;
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const PARTS = [
  ["vocals", "tracks.vocals"],
  ["guitar", "tracks.guitar"],
  ["bass", "tracks.bass"],
  ["drums", "tracks.drums"],
] as const;

export function TracksPage() {
  const { t, lang, nf } = useI18n();
  const res = useApi<ApiTrack[]>("/v2/cosmetics/tracks", lang);
  const shop = useApi<Shop>("/v2/shop", lang);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("new");
  const [onlyShop, setOnlyShop] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const inShop = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of shop.data?.entries ?? []) for (const tr of e.tracks ?? []) m.set(tr.id, e.finalPrice);
    return m;
  }, [shop.data]);

  const list = useMemo(() => {
    const nq = norm(q.trim());
    let l = (res.data ?? []).filter((x) => (!nq || norm(`${x.title} ${x.artist}`).includes(nq)) && (!onlyShop || inShop.has(x.id)));
    const col = new Intl.Collator(lang);
    if (sort === "new") l = [...l].sort((a, b) => (b.added ?? "").localeCompare(a.added ?? ""));
    if (sort === "az") l = [...l].sort((a, b) => col.compare(a.title, b.title));
    if (sort === "artist") l = [...l].sort((a, b) => col.compare(a.artist, b.artist));
    if (sort === "year") l = [...l].sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0));
    return l;
  }, [res.data, q, sort, onlyShop, inShop, lang]);

  if (!res.data) return <Loading state={res} />;
  const dur = (s?: number) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "");

  return (
    <>
      <header className="page-h">
        <h1>{t("tracks.title")}</h1>
        <p>{t("cos.count", { n: nf(list.length), total: nf(res.data.length) })}</p>
      </header>
      <div className="tools" role="search">
        <input className="search" type="search" value={q} placeholder={t("tracks.search")} aria-label={t("tracks.search")} onChange={(e) => (setQ(e.target.value), setLimit(PAGE))} />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t("sort.label")}>
          {(["new", "az", "artist", "year"] as Sort[]).map((k) => (
            <option key={k} value={k}>
              {t(`tracks.sort.${k}` as "tracks.sort.new")}
            </option>
          ))}
        </select>
        <label className="toggle">
          <input type="checkbox" checked={onlyShop} onChange={(e) => setOnlyShop(e.target.checked)} />
          <span>
            {t("tracks.onlyShop")} ({nf(inShop.size)})
          </span>
        </label>
      </div>
      <ul className="tracks">
        {list.slice(0, limit).map((x) => (
          <li key={x.id} data-shop={inShop.has(x.id) || undefined}>
            <img src={x.albumArt} alt="" loading="lazy" decoding="async" onError={hideBroken} />
            <div className="tr-main">
              <b>{x.title}</b>
              <small>
                {x.artist}
                {x.releaseYear ? ` · ${x.releaseYear}` : ""}
                {x.bpm ? ` · ${x.bpm} BPM` : ""}
                {x.duration ? ` · ${dur(x.duration)}` : ""}
              </small>
              {inShop.has(x.id) && <span className="tag tag-new">{t("tracks.inShop")}</span>}
            </div>
            <dl className="diff">
              {PARTS.map(([k, label]) => {
                const v = x.difficulty?.[k] ?? 0;
                return (
                  <div key={k} title={`${t(label)}: ${v + 1}/7`}>
                    <dt>{t(label)}</dt>
                    <dd aria-label={`${v + 1}/7`}>
                      {Array.from({ length: 7 }, (_, i) => (
                        <i key={i} data-on={i <= v || undefined} />
                      ))}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </li>
        ))}
      </ul>
      {list.length > limit && (
        <div className="more-row">
          <button type="button" className="btn" onClick={() => setLimit((l) => l + PAGE * 2)}>
            {t("common.showMore")} ({nf(list.length - limit)})
          </button>
        </div>
      )}
      <p className="note src">{t("common.source")}</p>
    </>
  );
}
