import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { useApi, type MapData } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Loading } from "../components/Loading";

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function MapPage() {
  const { t, lang, nf } = useI18n();
  const res = useApi<MapData>("/v1/map", lang);
  const [labels, setLabels] = useState(true);
  const [z, setZ] = useState({ s: 1, x: 0, y: 0 });
  const [q, setQ] = useState("");
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  const pois = useMemo(() => {
    const seen = new Set<string>();
    return (res.data?.pois ?? [])
      .map((p) => p.name?.trim())
      .filter((n): n is string => !!n && !seen.has(n) && !!seen.add(n))
      .sort(new Intl.Collator(lang).compare);
  }, [res.data, lang]);

  if (!res.data) return <Loading state={res} />;

  const clamp = (s: number) => Math.min(6, Math.max(1, s));
  const zoom = (f: number) => setZ((v) => {
    const s = clamp(v.s * f);
    return s === 1 ? { s, x: 0, y: 0 } : { s, x: v.x * (s / v.s), y: v.y * (s / v.s) };
  });
  const onWheel = (e: WheelEvent) => zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2);
  const onDown = (e: PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag.current = { x: e.clientX, y: e.clientY, ox: z.x, oy: z.y };
  };
  const onMove = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.current) zoom(d / pinch.current);
      pinch.current = d;
      return;
    }
    const g = drag.current;
    if (g && z.s > 1) setZ((v) => ({ ...v, x: g.ox + (e.clientX - g.x), y: g.oy + (e.clientY - g.y) }));
  };
  const onUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    drag.current = null;
  };

  const nq = norm(q.trim());
  return (
    <>
      <header className="page-h">
        <h1>{t("map.title")}</h1>
      </header>
      <div className="map-wrap">
        <div className="map-view" onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <img
            src={labels ? res.data.images.pois : res.data.images.blank}
            alt={t("map.title")}
            draggable={false}
            style={{ transform: `translate(${z.x}px, ${z.y}px) scale(${z.s})` }}
          />
        </div>
        <div className="map-ctl">
          <button type="button" className="btn" onClick={() => zoom(1.4)} aria-label={t("map.zoomIn")}>
            +
          </button>
          <button type="button" className="btn" onClick={() => zoom(1 / 1.4)} aria-label={t("map.zoomOut")}>
            −
          </button>
          <button type="button" className="btn" onClick={() => setZ({ s: 1, x: 0, y: 0 })}>
            {t("map.reset")}
          </button>
          <label className="toggle">
            <input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} />
            <span>{t("map.labels")}</span>
          </label>
        </div>
        <section className="map-pois">
          <h2 className="sec-h">
            {t("map.places")} <span className="sec-n">{nf(pois.length)}</span>
          </h2>
          <input className="search" type="search" value={q} placeholder={t("map.search")} aria-label={t("map.search")} onChange={(e) => setQ(e.target.value)} />
          <ul>
            {pois.filter((n) => !nq || norm(n).includes(nq)).map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      </div>
      <p className="note src">{t("common.source")}</p>
    </>
  );
}
