import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useI18n } from "../lib/i18n";
import { savedTheme, setTheme } from "../lib/theme";

type UiKey = Parameters<ReturnType<typeof useI18n>["t"]>[0];

/** Cores prontas. A primeira (sem cor) é o tema padrão, rosa e roxo. */
const PRESETS: { hex: string | null; label: UiKey }[] = [
  { hex: null, label: "theme.default" },
  { hex: "#8b5cf6", label: "theme.c.purple" },
  { hex: "#2f7bff", label: "theme.c.blue" },
  { hex: "#06b6d4", label: "theme.c.cyan" },
  { hex: "#22c55e", label: "theme.c.green" },
  { hex: "#a3e635", label: "theme.c.lime" },
  { hex: "#facc15", label: "theme.c.yellow" },
  { hex: "#ff8a1f", label: "theme.c.orange" },
  { hex: "#ef4444", label: "theme.c.red" },
  { hex: "#94a3b8", label: "theme.c.grey" },
];

/** Cor do site: prontas ou qualquer uma pelo seletor do sistema. Muda na hora e fica salva no aparelho. */
export function ThemeDialog({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [hex, setHex] = useState(savedTheme);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const pick = (v: string | null) => {
    setHex(v);
    setTheme(v);
  };
  const custom = hex !== null && !PRESETS.some((p) => p.hex === hex);

  return (
    <dialog ref={ref} className="sheet theme" aria-labelledby="th-h" onClose={onClose} onClick={(e) => e.target === ref.current && ref.current?.close()}>
      <div className="sheet-in">
        <header className="sh-head">
          <h2 id="th-h">{t("theme.title")}</h2>
          <button type="button" className="x" onClick={() => ref.current?.close()} aria-label={t("detail.close")}>
            ×
          </button>
        </header>
        <p className="note">{t("theme.desc")}</p>
        <div className="swatches" role="radiogroup" aria-labelledby="th-h">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              role="radio"
              aria-checked={hex === p.hex}
              className="swatch"
              data-default={p.hex ? undefined : ""}
              style={p.hex ? ({ "--sw": p.hex } as CSSProperties) : undefined}
              onClick={() => pick(p.hex)}
            >
              <span className="swatch-dot" aria-hidden />
              <span>{t(p.label)}</span>
            </button>
          ))}
          <label className="swatch swatch-custom" data-on={custom ? "" : undefined} style={custom ? ({ "--sw": hex } as CSSProperties) : undefined}>
            <span className="swatch-dot" aria-hidden>
              <input type="color" value={hex ?? "#ff3d8b"} onChange={(e) => pick(e.currentTarget.value.toLowerCase())} />
            </span>
            <span>{t("theme.custom")}</span>
          </label>
        </div>
      </div>
    </dialog>
  );
}
