import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { RARITIES, SEASONS, type Rarity, type Slot, type Sprite, type Status } from "../lib/data";
import { parseNumbers, readShared, storage, type Collection } from "../lib/collection";
import { useI18n } from "../lib/i18n";
import { rarityLabel, variantText } from "../lib/content";
import { relTime, SEASON_END, useUi } from "../lib/ui";
import { href } from "../lib/router";
import { Album, DEFAULT_FILTERS, type Filters, type SortKey, type StatusFilter } from "../components/Album";
import { Minimap, Stats, counts, visibleSlots } from "../components/Overview";
import { Detail } from "../components/Detail";
import { ShareDialog } from "../components/ShareDialog";
import { Compare } from "../components/Compare";
import { WeekEvents } from "../components/WeekEvents";

const CURRENT = SEASONS.find((s) => s.current) ?? SEASONS[0];

export function SpritesPage() {
  const { L, t, nf, lang } = useI18n();
  const { toast } = useUi();
  const [friend, setFriend] = useState(readShared);
  const [seasonId, setSeasonId] = useState(() => friend?.season ?? (storage.prefs().season as number) ?? CURRENT.id);
  const [mine, setMine] = useState<Collection>(storage.load);
  const [name, setName] = useState(storage.name);
  const [filters, setFilters] = useState<Filters>(() => ({ ...DEFAULT_FILTERS, unreleased: !!storage.prefs().unreleased }));
  const [detail, setDetail] = useState<Sprite | null>(null);
  const [sharing, setSharing] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [quick, setQuick] = useState("");

  const season = SEASONS.find((s) => s.id === seasonId) ?? CURRENT;
  const readOnly = !!friend && !comparing;
  const viewing = friend && !comparing ? friend.collection : mine;
  const slots = useMemo(() => visibleSlots(season, filters.unreleased), [season, filters.unreleased]);
  const c = counts(slots, viewing);

  useEffect(() => storage.save(mine), [mine]);
  useEffect(() => storage.setPrefs({ season: seasonId, unreleased: filters.unreleased }), [seasonId, filters.unreleased]);
  useEffect(() => {
    const onHash = () => setFriend(readShared());
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  const setStatus = useCallback((id: number, st: Status) => {
    setMine((m) => {
      const n = { ...m };
      if (st) n[id] = st;
      else delete n[id];
      return n;
    });
  }, []);
  const cycle = useCallback(
    (s: Slot) =>
      setMine((m) => {
        const n = { ...m };
        const next = (((m[s.id] ?? 0) + 1) % 3) as Status;
        if (next) n[s.id] = next;
        else delete n[s.id];
        return n;
      }),
    [],
  );

  const leaveFriend = () => {
    history.replaceState(null, "", location.pathname + location.search + href("sprites"));
    setFriend(null);
    setComparing(false);
  };

  const markQuick = (e: FormEvent) => {
    e.preventDefault();
    const nums = parseNumbers(quick, season.slots.length);
    const hit = season.slots.filter((s) => nums.includes(s.no));
    if (!hit.length) {
      toast(t("quick.invalid"));
      return;
    }
    setMine((m) => {
      const n = { ...m };
      for (const s of hit) if (!n[s.id]) n[s.id] = 1;
      return n;
    });
    setQuick("");
    toast(t("quick.done", { list: hit.map((s) => s.no).join(", ") }));
  };

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const friendName = friend?.name || t("compare.friend");
  const statusChips: StatusFilter[] = ["all", "owned", "missing", "mastered"];

  return (
    <>
      <div className="page-bar">
        <nav className="seasons" aria-label={t("nav.season")}>
          {SEASONS.map((s) => (
            <button key={s.id} type="button" aria-pressed={s.id === season.id} onClick={() => setSeasonId(s.id)}>
              <b>{t("season.short", { chapter: s.chapter, season: s.season })}</b>
              <small>{s.current ? t("season.current") : t("season.ended")}</small>
            </button>
          ))}
        </nav>
        <button type="button" className="btn btn-dust" onClick={() => setSharing(true)}>
          {t("share.button")}
        </button>
      </div>

      {friend && (
        <div className="friend" role="status">
          <p>{comparing ? t("compare.button") : t("compare.viewing", { name: friendName })}</p>
          <div>
            <button type="button" className="btn" onClick={() => setComparing((v) => !v)}>
              {comparing ? t("compare.viewing", { name: friendName }) : t("compare.button")}
            </button>
            <button type="button" className="btn btn-quiet" onClick={leaveFriend}>
              {t("compare.back")}
            </button>
          </div>
        </div>
      )}

      <section className="hero">
        <h1 className="hero-h">
          <span className="hero-season">{t("season.label", { chapter: season.chapter, season: season.season })}</span>
          <span className="hero-count">{t("progress.have", { owned: nf(c.owned), total: nf(c.total) })}</span>
          {season.current && Date.parse(SEASON_END) > Date.now() && (
            <a className="hero-ends" href={href("season")}>
              {t("season.left", { time: relTime(lang, Date.parse(SEASON_END)) })}
            </a>
          )}
        </h1>
        <Minimap slots={slots} collection={viewing} />
        <p className="hero-hint">{t("sticker.hint")}</p>
      </section>

      {season.current && !friend && <WeekEvents />}

      {friend && comparing && <Compare season={season} slots={slots} mine={mine} theirs={friend.collection} name={friendName} />}

      <div className="tools" role="search">
        <input className="search" type="search" value={filters.q} placeholder={t("filter.search")} aria-label={t("filter.search")} onChange={(e) => set("q", e.target.value)} />
        <div className="chips" role="radiogroup" aria-label={t("filter.all")}>
          {statusChips.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={filters.status === k} onClick={() => set("status", k)}>
              {t(`filter.${k}` as "filter.all")}
            </button>
          ))}
        </div>
        <select value={filters.rarity} onChange={(e) => set("rarity", e.target.value as "all" | Rarity)} aria-label={t("filter.rarityAll")}>
          <option value="all">{t("filter.rarityAll")}</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>
              {rarityLabel(L, r)}
            </option>
          ))}
        </select>
        <select value={filters.variant} onChange={(e) => set("variant", e.target.value)} aria-label={t("filter.variantAll")}>
          <option value="all">{t("filter.variantAll")}</option>
          {season.variants.map((v) => (
            <option key={v.key} value={v.key}>
              {variantText(L, v.key).label}
            </option>
          ))}
        </select>
        <select value={filters.sort} onChange={(e) => set("sort", e.target.value as SortKey)} aria-label={t("sort.label")}>
          {(["album", "az", "closest", "cost"] as SortKey[]).map((k) => (
            <option key={k} value={k}>
              {t(`sort.${k}` as "sort.album")}
            </option>
          ))}
        </select>
        <label className="toggle">
          <input type="checkbox" checked={filters.unreleased} onChange={(e) => set("unreleased", e.target.checked)} />
          <span>{t("filter.unreleased")}</span>
        </label>
        {!readOnly && (
          <form className="quick" onSubmit={markQuick}>
            <label>
              <span>{t("quick.label")}</span>
              <input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder={t("quick.placeholder")} inputMode="numeric" />
            </label>
            <button type="submit" className="btn" disabled={!quick.trim()}>
              {t("quick.button")}
            </button>
          </form>
        )}
      </div>

      <div className="layout">
        <div>
          <Album
            season={season}
            collection={viewing}
            filters={filters}
            readOnly={readOnly}
            onCycle={cycle}
            onOpen={setDetail}
            onClear={() => setFilters((f) => ({ ...DEFAULT_FILTERS, unreleased: f.unreleased }))}
          />
        </div>
        <aside className="rail">
          <Stats season={season} slots={slots} collection={viewing} />
        </aside>
      </div>

      {detail && <Detail season={season} sprite={detail} collection={viewing} readOnly={readOnly} onSet={setStatus} onClose={() => setDetail(null)} />}
      {sharing && (
        <ShareDialog
          season={season}
          slots={slots}
          collection={mine}
          name={name}
          onName={(n) => {
            setName(n);
            storage.setName(n);
          }}
          onRestore={setMine}
          onReset={() =>
            setMine((m) => {
              const n = { ...m };
              for (const s of season.slots) delete n[s.id];
              return n;
            })
          }
          onClose={() => setSharing(false)}
          toast={toast}
        />
      )}
    </>
  );
}
