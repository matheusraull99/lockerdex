import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../lib/i18n";
import type { Point } from "../lib/islands";

const H = 180;
const PAD = { top: 12, right: 12, bottom: 24, left: 44 };

/**
 * Linha de uma série só (jogadores por hora), com área clara embaixo.
 * Passar o dedo ou o mouse mostra a hora e o valor; a tabela escondida serve ao leitor de tela.
 */
export function PeakChart({ points, label }: { points: Point[]; label: string }) {
  const { lang, nf } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(() => points.filter((p): p is { value: number; timestamp: string } => p.value != null), [points]);
  const fmt = useMemo(() => {
    const compact = new Intl.NumberFormat(lang, { notation: "compact", maximumFractionDigits: 1 });
    const hour = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" });
    const full = new Intl.DateTimeFormat(lang, { weekday: "short", hour: "2-digit", minute: "2-digit" });
    return { compact: (n: number) => compact.format(n), hour: (s: string) => hour.format(new Date(s)), full: (s: string) => full.format(new Date(s)) };
  }, [lang]);

  if (data.length < 2) return null;

  const max = Math.max(...data.map((p) => p.value));
  const top = niceMax(max);
  const iw = w - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (iw * i) / (data.length - 1);
  const y = (v: number) => PAD.top + ih - (ih * v) / top;
  const line = data.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = `${line}L${x(data.length - 1).toFixed(1)},${PAD.top + ih}L${PAD.left},${PAD.top + ih}Z`;
  const ticks = [0, top / 2, top];
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(iw / 70))));

  const pick = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    const px = clientX - r.left;
    const i = Math.round(((px - PAD.left) / iw) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  };

  const h = hover != null ? data[hover] : null;
  const tipLeft = hover != null ? Math.min(Math.max(x(hover), 70), w - 70) : 0;

  return (
    <figure className="peak">
      <figcaption>{label}</figcaption>
      <div
        ref={box}
        className="peak-box"
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label={label}>
          {ticks.map((v) => (
            <g key={v} className="peak-grid">
              <line x1={PAD.left} x2={w - PAD.right} y1={y(v)} y2={y(v)} />
              <text x={PAD.left - 6} y={y(v)} dy="0.32em" textAnchor="end">
                {fmt.compact(v)}
              </text>
            </g>
          ))}
          {data.map((p, i) =>
            i % every === 0 ? (
              <text key={p.timestamp} className="peak-x" x={x(i)} y={H - 6} textAnchor="middle">
                {fmt.hour(p.timestamp)}
              </text>
            ) : null,
          )}
          <path className="peak-area" d={area} />
          <path className="peak-line" d={line} />
          {h && (
            <g className="peak-hover">
              <line x1={x(hover!)} x2={x(hover!)} y1={PAD.top} y2={PAD.top + ih} />
              <circle cx={x(hover!)} cy={y(h.value)} r={5} />
            </g>
          )}
        </svg>
        {h && (
          <div className="peak-tip" style={{ left: tipLeft }} aria-hidden>
            <b>{nf(h.value)}</b>
            <span>{fmt.full(h.timestamp)}</span>
          </div>
        )}
      </div>
      {/* Tabela não encolhe com width: 1px; quem esconde é o div em volta. */}
      <div className="sr">
        <table>
          <caption>{label}</caption>
          <tbody>
            {data.map((p) => (
              <tr key={p.timestamp}>
                <th scope="row">{fmt.full(p.timestamp)}</th>
                <td>{nf(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/** Topo do eixo arredondado para um número redondo (1; 1,5; 2; 2,5; 5 × 10ⁿ). */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.5, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
