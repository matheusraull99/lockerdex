import { useMemo, useState, type CSSProperties } from "react";
import { hideBroken } from "../lib/data";
import { useApi, type Shop, type ShopEntry } from "../lib/api";
import { rarityColor, useCatalog } from "../lib/catalog";
import { useI18n } from "../lib/i18n";
import { useLists } from "../lib/lists";
import { relTime } from "../lib/ui";
import { href } from "../lib/router";
import { CosmeticDialog } from "../components/Cosmetic";
import { Loading } from "../components/Loading";

function entryView(e: ShopEntry) {
  const br = e.brItems ?? [];
  const main = br[0];
  const image =
    e.newDisplayAsset?.renderImages?.[0]?.image ||
    e.bundle?.image ||
    main?.images.featured ||
    main?.images.icon ||
    e.cars?.[0]?.images.large ||
    e.instruments?.[0]?.images.large ||
    e.legoKits?.[0]?.images.large ||
    e.tracks?.[0]?.albumArt ||
    "";
  const name = e.bundle?.name || main?.name || e.cars?.[0]?.name || e.instruments?.[0]?.name || e.legoKits?.[0]?.name || e.tracks?.[0]?.title || "";
  const rarity = main?.rarity.value || e.cars?.[0]?.rarity.value || e.instruments?.[0]?.rarity.value || "common";
  const ids = br.map((b) => b.id);
  return { image, name, rarity, ids, main };
}

/** Próxima troca da loja: 00:00 UTC. */
function nextReset() {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

export function ShopPage() {
  const { t, lang, nf } = useI18n();
  const shop = useApi<Shop>("/v2/shop", lang);
  const { catalog } = useCatalog(lang);
  const { wish, own } = useLists();
  const [open, setOpen] = useState<string | null>(null);

  const groups = useMemo(() => {
    const entries = shop.data?.entries ?? [];
    const onlyTracks = (e: ShopEntry) => !!e.tracks?.length && !e.brItems?.length && !e.bundle;
    const map = new Map<string, { name: string; order: number; entries: ShopEntry[] }>();
    for (const e of entries) {
      if (onlyTracks(e)) continue;
      const name = e.layout?.name?.trim() || t("shop.other");
      const g = map.get(name) ?? { name, order: e.layout?.index ?? 999, entries: [] };
      g.entries.push(e);
      map.set(name, g);
    }
    const list = [...map.values()].sort((a, b) => a.order - b.order);
    list.forEach((g) => g.entries.sort((a, b) => (b.layout?.rank ?? 0) - (a.layout?.rank ?? 0)));
    return { list, tracks: entries.filter(onlyTracks) };
  }, [shop.data, t]);

  if (!shop.data) return <Loading state={shop} />;

  const wishedToday = shop.data.entries.filter((e) => (e.brItems ?? []).some((b) => wish.has(b.id))).length;
  const vb = shop.data.vbuckIcon;
  const price = (e: ShopEntry) => (
    <span className="price">
      <img src={vb} alt="V-Bucks" width="16" height="16" />
      <b>{nf(e.finalPrice)}</b>
      {e.regularPrice > e.finalPrice && <s>{nf(e.regularPrice)}</s>}
    </span>
  );

  return (
    <>
      <header className="page-h">
        <h1>{t("shop.title")}</h1>
        <p>{t("shop.resets", { time: relTime(lang, nextReset()) })}</p>
        {wishedToday > 0 && (
          <a className="wish-alert" href={href("lists")}>
            ♥ {t("shop.wishToday", { n: nf(wishedToday) })}
          </a>
        )}
      </header>

      {groups.list.map((g) => (
        <section key={g.name} className="shop-sec">
          <h2 className="sec-h">{g.name}</h2>
          <div className="shop-grid">
            {g.entries.map((e) => {
              const v = entryView(e);
              const wished = v.ids.some((id) => wish.has(id));
              const owned = v.ids.length > 0 && v.ids.every((id) => own.has(id));
              const wide = e.tileSize?.startsWith("Size_2") || e.tileSize?.startsWith("Size_3");
              const c1 = e.colors?.color1 ? `#${e.colors.color1.slice(0, 6)}` : rarityColor(v.rarity);
              const c2 = e.colors?.color2 ? `#${e.colors.color2.slice(0, 6)}` : "#1d1640";
              const leaves = Date.parse(e.outDate);
              return (
                <button
                  key={e.offerId}
                  type="button"
                  className={`tile${wide ? " tile-wide" : ""}`}
                  style={{ "--c1": c1, "--c2": c2 } as CSSProperties}
                  data-wished={wished || undefined}
                  onClick={() => v.main && setOpen(v.main.id)}
                  disabled={!v.main}
                >
                  <img src={v.image} alt="" loading="lazy" decoding="async" onError={hideBroken} />
                  <span className="tile-info">
                    <span className="tile-name">{v.name}</span>
                    {price(e)}
                  </span>
                  <span className="tile-tags">
                    {wished && <span className="tag tag-new">♥ {t("shop.wished")}</span>}
                    {owned && <span className="tag tag-own">✓ {t("shop.owned")}</span>}
                    {leaves <= nextReset() + 3600 * 1000 && <span className="tag tag-dark">{t("shop.leaves", { time: relTime(lang, leaves) })}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {groups.tracks.length > 0 && (
        <section className="shop-sec">
          <h2 className="sec-h">
            {t("shop.tracks")} <span className="sec-n">{nf(groups.tracks.length)}</span>
          </h2>
          <ul className="track-strip">
            {groups.tracks.map((e) => {
              const tr = e.tracks![0];
              return (
                <li key={e.offerId}>
                  <img src={tr.albumArt} alt="" loading="lazy" onError={hideBroken} />
                  <span>
                    <b>{tr.title}</b>
                    <small>{tr.artist}</small>
                  </span>
                  {price(e)}
                </li>
              );
            })}
          </ul>
          <a className="btn" href={href("tracks")}>
            {t("nav.tracks")} →
          </a>
        </section>
      )}

      <p className="note src">{t("common.source")}</p>
      {open && <CosmeticDialog id={open} catalog={catalog} onClose={() => setOpen(null)} />}
    </>
  );
}
