import { useEffect, useMemo, useRef, useState } from "react";
import type { Season, Slot } from "../lib/data";
import { shareUrl, storage, type Collection } from "../lib/collection";
import { copyText } from "../lib/clipboard";
import { useUi } from "../lib/ui";
import { useI18n } from "../lib/i18n";
import { albumPng, imageTheme } from "../lib/exportImage";
import { cardPng, type CardKind } from "../lib/exportCards";
import { savedTheme } from "../lib/theme";
import { rarityLabel, seasonName, spriteText, variantText } from "../lib/content";
import { closest } from "./Ring";

interface Props {
  season: Season;
  slots: Slot[];
  collection: Collection;
  friend?: { collection: Collection; name: string }; // coleção do amigo aberta pelo link: libera o "Duelo"
  onClose: () => void;
}

type Layout = "full" | CardKind;
const LAYOUTS: Layout[] = ["card", "showcase", "help", "page", "duel", "full"];
const LABEL: Record<Layout, Parameters<ReturnType<typeof useI18n>["t"]>[0]> = {
  full: "share.layout.full",
  card: "share.layout.card",
  showcase: "share.layout.showcase",
  help: "share.layout.help",
  page: "share.layout.page",
  duel: "share.layout.duel",
};

/**
 * Compartilhar = escolher o modelo, ver a prévia e baixar a imagem (PNG ou WebP).
 * Modelos: os 5 de story (cartão, vitrine, me ajuda a fechar, página de álbum, duelo) e a tabela completa.
 */
export function ShareDialog({ season, slots, collection, friend, onClose }: Props) {
  const { t, L, dir, nf } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [layout, setLayout] = useState<Layout>("card");
  const [preview, setPreview] = useState("");
  const [name, setName] = useState(() => storage.name());
  const [manual, setManual] = useState(""); // link à mostra quando o navegador não deixa copiar
  const { toast } = useUi();

  // Link da coleção: quem abrir vê as suas figurinhas e pode comparar com as dele (e fazer o Duelo).
  // No celular abre o menu de compartilhar do aparelho (WhatsApp etc.); senão copia; se nem isso, mostra o link.
  const sendLink = async () => {
    storage.setName(name.trim());
    const link = shareUrl(collection, name, season.id);
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: "Lockerdex", text: t("share.linkHint"), url: link });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // a pessoa fechou o menu
      }
    }
    if (await copyText(link)) {
      setManual("");
      toast(t("share.copied"));
    } else setManual(link);
  };

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const owned = slots.filter((s) => (collection[s.id] ?? 0) > 0).length;
  const mastered = slots.filter((s) => collection[s.id] === 2).length;
  const short = seasonName(t, season, true);
  const url = new URL(`${import.meta.env.BASE_URL}sprites/`, location.origin).href;
  const footerText = `${location.host}${import.meta.env.BASE_URL}sprites`;
  const friendName = friend?.name || t("card.friend");

  const draw = useMemo(
    () => (kind: Layout, format: "png" | "webp") => {
      const common = {
        season,
        slots,
        collection,
        dir,
        theme: imageTheme(savedTheme()),
        url,
        footer: footerText,
        spriteName: (key: string) => spriteText(L, key).name,
        variantLabel: (key: string) => variantText(L, key).label,
        format,
      };
      if (kind === "full")
        return albumPng({
          ...common,
          brandTagline: t("app.tagline"),
          title: seasonName(t, season),
          have: t("progress.have", { owned, total: slots.length }),
          legend: { owned: t("status.owned"), mastered: t("status.mastered"), missing: t("status.missing") },
          owner: storage.name().trim(),
        });
      const next = closest(season, collection, true);
      return cardPng({
        ...common,
        kind,
        friend: friend?.collection,
        rarityLabel: (r) => rarityLabel(L, r),
        avatar: `${import.meta.env.BASE_URL}avatar/bust.webp`,
        texts: {
          seasonShort: short,
          seasonTitle: seasonName(t, season),
          owned: t("status.owned"),
          mastered: t("status.mastered"),
          ofAlbum: t("card.ofAlbum"),
          showcase: t("card.showcase"),
          helpTitle: t("card.helpTitle"),
          helpSub: t("card.helpSub", { n: nf(slots.length - owned), season: short }),
          closest: next ? t("album.next", { name: spriteText(L, next.sprite.key).name, owned: nf(next.owned), total: nf(next.total) }) : null,
          complete: t("card.complete"),
          pageSub: t("card.pageSub", { owned: nf(owned), total: nf(slots.length), mastered: nf(mastered) }),
          duelTitle: t("card.duel"),
          me: t("card.me"),
          friend: friendName,
          onlyMe: t("card.onlyMe"),
          onlyFriend: t("card.onlyFriend", { name: friendName }),
          both: t("card.both"),
          tagline: t("card.tagline"),
        },
      });
    },
    [season, slots, collection, friend, dir, L, t, nf, owned, mastered, short, url, footerText, friendName],
  );

  // Prévia do modelo escolhido (gerada na hora; troca quando muda o modelo).
  useEffect(() => {
    let alive = true;
    let href = "";
    setPreview("");
    draw(layout, "webp").then((b) => {
      if (!alive) return;
      href = URL.createObjectURL(b);
      setPreview(href);
    });
    return () => {
      alive = false;
      if (href) URL.revokeObjectURL(href);
    };
  }, [layout, draw]);

  const download = async (format: "png" | "webp") => {
    setBusy(true);
    try {
      const blob = await draw(layout, format);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      // Se o navegador não gerar WebP, o arquivo sai PNG: a extensão segue o tipo real.
      a.download = `lockerdex-${layout}-${season.code.toLowerCase()}.${blob.type === "image/webp" ? "webp" : "png"}`;
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

        <div className="layout-pick layout-pick-6" role="radiogroup" aria-label={t("share.layout.label")}>
          {LAYOUTS.map((k) => {
            const off = k === "duel" && !friend;
            return (
              <button key={k} type="button" role="radio" aria-checked={layout === k} onClick={() => setLayout(k)} disabled={busy || off} title={off ? t("share.duelHint") : undefined}>
                <b>{t(LABEL[k])}</b>
                <span>{off ? t("share.duelHint") : k === "full" ? "" : "1080×1920"}</span>
              </button>
            );
          })}
        </div>

        <figure className="share-prev" aria-label={t("share.preview")}>
          {preview ? <img src={preview} alt={t(LABEL[layout])} /> : <span className="share-prev-wait" aria-hidden />}
        </figure>

        <div className="share-link">
          <label htmlFor="sh-name">{t("share.name")}</label>
          <div className="share-link-row">
            <input id="sh-name" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
            <button type="button" className="btn btn-dust" onClick={sendLink}>
              {t("share.copy")} {t("share.link").toLowerCase()}
            </button>
          </div>
          {manual && <input className="share-link-manual" readOnly value={manual} aria-label={t("share.link")} onFocus={(e) => e.currentTarget.select()} autoFocus />}
          <p className="share-link-hint">{t("share.linkHint")}</p>
        </div>

        <div className="fmt" role="group" aria-labelledby="fmt-h">
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
