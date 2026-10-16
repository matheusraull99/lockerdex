import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type TouchEvent } from "react";
import { RARITIES, SEASONS, type Rarity, type Slot, type Sprite, type Status } from "../lib/data";
import { parseNumbers, readShared, storage, type Collection } from "../lib/collection";
import { loadLevels, saveLevels, type LevelMap } from "../lib/levels";
import { useI18n } from "../lib/i18n";
import { rarityLabel, spriteText, variantText } from "../lib/content";
import { relTime, SEASON_END, useUi } from "../lib/ui";
import { href, NAV_EVENT } from "../lib/router";
import { Album, DEFAULT_FILTERS, type Filters, type SortKey, type StatusFilter } from "../components/Album";
import { Minimap, Stats, counts, visibleSlots } from "../components/Overview";
import { Detail } from "../components/Detail";
import { ShareDialog } from "../components/ShareDialog";
import { Compare } from "../components/Compare";
import { WeekEvents } from "../components/WeekEvents";
import { Ring, closest } from "../components/Ring";
import { MOBILE, haptic, reducedMotion, useMedia } from "../lib/media";
import { confetti } from "../lib/confetti";
import { QUICK_EVENT, takeQuick } from "../lib/quick";

const CURRENT = SEASONS.find((s) => s.current) ?? SEASONS[0];

export function SpritesPage() {
  const { L, t, nf, lang } = useI18n();
  const { toast } = useUi();
  const [friend, setFriend] = useState(readShared);
  const [seasonId, setSeasonId] = useState(() => friend?.season ?? (storage.prefs().season as number) ?? CURRENT.id);
  const [mine, setMine] = useState<Collection>(storage.load);
  const [levels, setLevels] = useState<LevelMap>(loadLevels);
  const [filters, setFilters] = useState<Filters>(() => ({ ...DEFAULT_FILTERS, unreleased: !!storage.prefs().unreleased }));
  const [detail, setDetail] = useState<Sprite | null>(null);
  const [sharing, setSharing] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [quick, setQuick] = useState("");
  // Celular: o álbum mostra uma raridade por vez (abas + deslizar para o lado); a busca mostra todas.
  const mobile = useMedia(MOBILE);
  const [page, setPage] = useState<Rarity>(RARITIES[0]);
  const [slide, setSlide] = useState(0); // direção da última troca de página, para a animação
  const [quickOpen, setQuickOpen] = useState(false);
  const albumRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const season = SEASONS.find((s) => s.id === seasonId) ?? CURRENT;
  const readOnly = !!friend && !comparing;
  const viewing = friend && !comparing ? friend.collection : mine;
  const slots = useMemo(() => visibleSlots(season, filters.unreleased), [season, filters.unreleased]);
  const c = counts(slots, viewing);
  const paged = mobile && !filters.q.trim();
  const albumFilters = paged ? { ...filters, rarity: page } : filters;
  const mineRef = useRef(mine);
  mineRef.current = mine;

  useEffect(() => storage.save(mine), [mine]);
  useEffect(() => saveLevels(levels), [levels]);
  useEffect(() => storage.setPrefs({ season: seasonId, unreleased: filters.unreleased }), [seasonId, filters.unreleased]);
  useEffect(() => {
    // Sai (ou entra) na coleção do amigo quando o endereço muda: link #c=…, logo, aba Elementais, voltar.
    const onHash = () => {
      const f = readShared();
      setFriend(f);
      if (!f) setComparing(false);
    };
    addEventListener("hashchange", onHash);
    addEventListener("popstate", onHash);
    addEventListener(NAV_EVENT, onHash);
    return () => {
      removeEventListener("hashchange", onHash);
      removeEventListener("popstate", onHash);
      removeEventListener(NAV_EVENT, onHash);
    };
  }, []);

  const setStatus = useCallback((id: number, st: Status) => {
    setMine((m) => {
      const n = { ...m };
      if (st) n[id] = st;
      else delete n[id];
      return n;
    });
  }, []);
  // Tocar no nível que já está marcado tira o nível.
  const setLevel = useCallback((id: number, n: number) => {
    setLevels((l) => {
      const out = { ...l };
      if (!n || l[id] === n) delete out[id];
      else out[id] = n;
      return out;
    });
  }, []);
  // Marca a figurinha (falta → tenho → dominado). Ao fechar um elemental inteiro (ou dominar todas), festa.
  const cycle = useCallback(
    (s: Slot) => {
      const m = mineRef.current;
      const n = { ...m };
      const next = (((m[s.id] ?? 0) + 1) % 3) as Status;
      if (next) n[s.id] = next;
      else delete n[s.id];
      mineRef.current = n;
      setMine(n);
      haptic(next ? 12 : 6);
      const all = s.sprite.slots.filter((x) => !x.unreleased);
      if (!next || !all.length) return;
      const every = (col: Collection, min: number) => all.every((x) => (col[x.id] ?? 0) >= min);
      const name = spriteText(L, s.sprite.key).name;
      const el = document.getElementById(`st-${s.id}`);
      if (every(n, 2) && !every(m, 2)) {
        confetti(el, true);
        toast(t("album.mastered", { name }));
      } else if (every(n, 1) && !every(m, 1)) {
        confetti(el);
        toast(t("album.complete", { name }));
      }
    },
    [L, t, toast],
  );

  // Troca de página (raridade) no celular; volta o álbum para o topo se ele já tinha passado da tela.
  const turn = (r: Rarity) => {
    if (r === page) return;
    setSlide(RARITIES.indexOf(r) > RARITIES.indexOf(page) ? 1 : -1);
    setPage(r);
    const top = albumRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) scrollBy({ top: top - 130, behavior: reducedMotion() ? "auto" : "smooth" });
  };
  const onTouchStart = (e: TouchEvent) => {
    const p = e.touches[0];
    touch.current = { x: p.clientX, y: p.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const s = touch.current;
    touch.current = null;
    if (!s || !paged) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - s.x;
    const dy = p.clientY - s.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    const rtl = document.documentElement.dir === "rtl";
    const step = dx < 0 !== rtl ? 1 : -1; // arrastar para a esquerda = próxima página
    const i = RARITIES.indexOf(page) + step;
    if (i >= 0 && i < RARITIES.length) turn(RARITIES[i]);
  };

  // Botão "Nº" da barra de baixo: abre o marcar por número (vem de qualquer página).
  useEffect(() => {
    const open = () => {
      if (takeQuick()) setQuickOpen(true);
    };
    open();
    addEventListener(QUICK_EVENT, open);
    return () => removeEventListener(QUICK_EVENT, open);
  }, []);
  useEffect(() => {
    if (!quickOpen) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setQuickOpen(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [quickOpen]);

  const leaveFriend = () => {
    history.replaceState(null, "", href("sprites")); // tira o #c=… da coleção do amigo
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
    setQuickOpen(false);
    haptic(12);
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
        {mobile ? (
          <Ring owned={c.owned} total={c.total} next={closest(season, viewing, filters.unreleased)} hint={t("sticker.hint")} />
        ) : (
          <Minimap slots={slots} collection={viewing} />
        )}
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
        <select className="f-rarity" value={filters.rarity} onChange={(e) => set("rarity", e.target.value as "all" | Rarity)} aria-label={t("filter.rarityAll")}>
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

      {mobile && (
        <nav className={paged ? "rtabs" : "rtabs rtabs-off"} aria-label={t("filter.rarityAll")}>
          {RARITIES.map((r) => {
            const rs = slots.filter((s) => s.sprite.rarity === r);
            return (
              <button key={r} type="button" data-rarity={r} aria-pressed={paged && page === r} onClick={() => turn(r)}>
                <b>{rarityLabel(L, r)}</b>
                <small>
                  {nf(rs.filter((s) => (viewing[s.id] ?? 0) > 0).length)}/{nf(rs.length)}
                </small>
              </button>
            );
          })}
        </nav>
      )}

      <div className="layout">
        <div
          ref={albumRef}
          className={paged ? "pg-in" : undefined}
          key={paged ? page : "all"}
          data-dir={slide}
          onTouchStart={mobile ? onTouchStart : undefined}
          onTouchEnd={mobile ? onTouchEnd : undefined}
        >
          <Album
            paged={paged}
            season={season}
            collection={viewing}
            filters={albumFilters}
            readOnly={readOnly}
            levels={readOnly ? undefined : levels}
            onCycle={cycle}
            onOpen={setDetail}
            onClear={() => setFilters((f) => ({ ...DEFAULT_FILTERS, unreleased: f.unreleased }))}
          />
        </div>
        <aside className="rail">
          <Stats season={season} slots={slots} collection={viewing} />
        </aside>
      </div>

      {detail && <Detail season={season} sprite={detail} collection={viewing} levels={levels} readOnly={readOnly} onSet={setStatus} onLevel={setLevel} onClose={() => setDetail(null)} />}
      {sharing && <ShareDialog season={season} slots={slots} collection={mine} onClose={() => setSharing(false)} />}
      {quickOpen && !readOnly && (
        <div className="qsheet-bg" onClick={() => setQuickOpen(false)}>
          <form className="qsheet" role="dialog" aria-modal="true" aria-label={t("quick.label")} onClick={(e) => e.stopPropagation()} onSubmit={markQuick}>
            <h2>{t("quick.label")}</h2>
            <input
              autoFocus
              value={quick}
              onChange={(e) => setQuick(e.target.value)}
              placeholder={t("quick.placeholder")}
              inputMode="numeric"
              aria-label={t("quick.label")}
            />
            <div className="qsheet-act">
              <button type="button" className="btn btn-quiet" onClick={() => setQuickOpen(false)}>
                {t("detail.close")}
              </button>
              <button type="submit" className="btn btn-dust" disabled={!quick.trim()}>
                {t("quick.button")}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
