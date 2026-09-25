import { useEffect, useRef, useState } from "react";
import type { Season, Slot } from "../lib/data";
import { storage, type Collection } from "../lib/collection";
import { useI18n } from "../lib/i18n";
import { albumPng } from "../lib/exportImage";
import { spriteText, variantText } from "../lib/content";

interface Props {
  season: Season;
  slots: Slot[];
  collection: Collection;
  onClose: () => void;
}

/** Compartilhar = baixar a imagem da coleção, em PNG ou WebP. */
export function ShareDialog({ season, slots, collection, onClose }: Props) {
  const { t, L, dir } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const owned = slots.filter((s) => (collection[s.id] ?? 0) > 0).length;

  const download = async (format: "png" | "webp") => {
    setBusy(true);
    try {
      const blob = await albumPng({
        season,
        slots,
        collection,
        dir,
        brandTagline: t("app.tagline"),
        title: t("season.label", { chapter: season.chapter, season: season.season }),
        have: t("progress.have", { owned, total: slots.length }),
        legend: { owned: t("status.owned"), mastered: t("status.mastered"), missing: t("status.missing") },
        owner: storage.name().trim(),
        footer: location.host + location.pathname.replace(/\/$/, ""),
        spriteName: (key) => spriteText(L, key).name,
        variantLabel: (key) => variantText(L, key).label,
        format,
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      // Se o navegador não gerar WebP, o arquivo sai PNG: a extensão segue o tipo real.
      a.download = `lockerdex-sprites-${season.code.toLowerCase()}.${blob.type === "image/webp" ? "webp" : "png"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      ref.current?.close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="sheet share" aria-labelledby="sh-h" onClose={onClose} onClick={(e) => e.target === ref.current && ref.current?.close()}>
      <div className="sheet-in">
        <header className="sh-head">
          <h2 id="sh-h">{t("share.title")}</h2>
          <button type="button" className="x" onClick={() => ref.current?.close()} aria-label={t("detail.close")}>
            ×
          </button>
        </header>

        <div className="fmt" role="group" aria-labelledby="fmt-h">
          <span className="fmt-ic" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <circle cx="9" cy="10" r="2" />
              <path d="M21 16l-5-5-8 9" />
            </svg>
          </span>
          <p id="fmt-h" className="fmt-h">
            {t("share.format.title")}
          </p>
          <p className="fmt-desc">{t("share.format.desc")}</p>
          <div className="fmt-btns">
            <button type="button" className="btn" onClick={() => download("png")} disabled={busy}>
              PNG
            </button>
            <button type="button" className="btn btn-dust" onClick={() => download("webp")} disabled={busy}>
              WebP
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
