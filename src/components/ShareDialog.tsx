import { useEffect, useRef, useState } from "react";
import type { Season, Slot } from "../lib/data";
import { encode, parseBackup, shareUrl, type Collection } from "../lib/collection";
import { useI18n } from "../lib/i18n";
import { albumPng } from "../lib/exportImage";
import { spriteText, variantText } from "../lib/content";

interface Props {
  season: Season;
  slots: Slot[];
  collection: Collection;
  name: string;
  onName: (n: string) => void;
  onRestore: (c: Collection) => void;
  onReset: () => void;
  onClose: () => void;
  toast: (msg: string) => void;
}

function CopyRow({ value, multiline }: { value: string; multiline?: boolean }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* sem permissão de área de transferência: o texto continua selecionável */
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };
  return (
    <div className="copy">
      {multiline ? <textarea readOnly value={value} rows={3} onFocus={(e) => e.target.select()} /> : <input readOnly value={value} onFocus={(e) => e.target.select()} />}
      <button type="button" className="btn" onClick={copy}>
        {done ? t("share.copied") : t("share.copy")}
      </button>
    </div>
  );
}

export function ShareDialog({ season, slots, collection, name, onName, onRestore, onReset, onClose, toast }: Props) {
  const { t, L, dir } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [restore, setRestore] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const seasonShort = t("season.short", { chapter: season.chapter, season: season.season });
  const missing = slots.filter((s) => !(collection[s.id] ?? 0)).map((s) => s.no);
  const missingText = t("share.missingText", { season: seasonShort, n: missing.length, list: missing.join(", ") });
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
        owner: name.trim(),
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
    } finally {
      setBusy(false);
      setPicking(false);
    }
  };

  const doRestore = () => {
    const c = parseBackup(restore);
    if (!c) {
      setErr(t("share.restoreInvalid"));
      return;
    }
    onRestore(c);
    setErr("");
    setRestore("");
    toast(t("share.restored"));
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

        <label className="fld">
          <span>{t("share.name")}</span>
          <input value={name} maxLength={32} onChange={(e) => onName(e.target.value)} autoComplete="nickname" />
        </label>

        <div className="fld">
          <span>{t("share.link")}</span>
          <CopyRow value={shareUrl(collection, name, season.id)} />
        </div>

        <div className="fld">
          <span>{t("share.missing")}</span>
          <CopyRow value={missingText} multiline />
        </div>

        {picking ? (
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
            <button type="button" className="btn btn-quiet" onClick={() => setPicking(false)} disabled={busy}>
              {t("share.format.cancel")}
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-dust" onClick={() => setPicking(true)}>
            {t("share.image")}
          </button>
        )}

        <hr />

        <div className="fld">
          <span>{t("share.backup")}</span>
          <small>{t("share.backupHint")}</small>
          <CopyRow value={encode(collection) || "1"} />
        </div>
        <div className="fld">
          <div className="copy">
            <input value={restore} placeholder={t("share.restorePlaceholder")} onChange={(e) => setRestore(e.target.value)} aria-label={t("share.restore")} />
            <button type="button" className="btn" onClick={doRestore} disabled={!restore.trim()}>
              {t("share.restore")}
            </button>
          </div>
          {err && (
            <small className="err" role="alert">
              {err}
            </small>
          )}
        </div>

        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            if (confirm(t("share.resetConfirm"))) onReset();
          }}
        >
          {t("share.reset")}
        </button>
      </div>
    </dialog>
  );
}
