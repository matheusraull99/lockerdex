import { memo, useEffect, useRef, type CSSProperties } from "react";
import { hideBroken } from "../lib/data";
import { iconUrl, useApi, type ApiCosmetic } from "../lib/api";
import { daysSince, rarityColor, type Catalog, type Item } from "../lib/catalog";
import { useI18n } from "../lib/i18n";
import { useLists } from "../lib/lists";
import { fmtDate, relTime } from "../lib/ui";

/** Card de cosmético na grade: ícone sobre a cor da raridade, nome e os botões Quero / Tenho. */
export const CosmeticCard = memo(function CosmeticCard({
  item,
  wished,
  owned,
  badge,
  onOpen,
  onToggle,
}: {
  item: Pick<Item, "id" | "name" | "rarity" | "type">;
  wished: boolean;
  owned: boolean;
  badge?: string;
  onOpen: (id: string) => void;
  onToggle: (which: "wish" | "own", id: string) => void;
}) {
  const { t } = useI18n();
  return (
    <article className="cz" style={{ "--rc": rarityColor(item.rarity) } as CSSProperties} data-owned={owned || undefined}>
      <button type="button" className="cz-art" onClick={() => onOpen(item.id)} aria-label={item.name}>
        <img src={iconUrl(item.id)} alt="" loading="lazy" decoding="async" onError={hideBroken} />
        {badge && <span className="cz-badge">{badge}</span>}
      </button>
      <p className="cz-name" title={item.name}>
        {item.name}
      </p>
      <div className="cz-act">
        <button type="button" aria-pressed={wished} onClick={() => onToggle("wish", item.id)} aria-label={`${t("cos.wish")}: ${item.name}`}>
          {wished ? "♥" : "♡"} <span>{t("cos.wish")}</span>
        </button>
        <button type="button" aria-pressed={owned} onClick={() => onToggle("own", item.id)} aria-label={`${t("cos.own")}: ${item.name}`}>
          ✓ <span>{t("cos.own")}</span>
        </button>
      </div>
    </article>
  );
});

/** Ficha do cosmético: dados ao vivo da API + histórico de loja do catálogo. */
export function CosmeticDialog({ id, catalog, onClose }: { id: string; catalog?: Catalog; onClose: () => void }) {
  const { t, lang, nf } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const { lists, toggle } = useLists();
  const live = useApi<ApiCosmetic>(`/v2/cosmetics/br/${encodeURIComponent(id)}`, lang);
  const item = catalog?.byId.get(id.toLowerCase());
  const d = live.data;

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  const name = d?.name ?? item?.name ?? id;
  const rarity = d?.rarity.value ?? item?.rarity ?? "";
  const wished = lists.wish.includes(id);
  const owned = lists.own.includes(id);
  const intro = d?.introduction ? [d.introduction.chapter, d.introduction.season] : item?.intro;

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="cz-h" onClose={onClose} onClick={(e) => e.target === ref.current && ref.current?.close()}>
      <div className="sheet-in">
        <header className="cz-head" style={{ "--rc": rarityColor(rarity) } as CSSProperties}>
          <div className="cz-big">
            <img src={d?.images.featured || d?.images.icon || iconUrl(id, "icon")} alt="" onError={hideBroken} />
          </div>
          <div>
            <p className="dt-rar">
              <span className="rar-dot" aria-hidden />
              {d?.rarity.displayValue ?? catalog?.rarities[rarity] ?? rarity} · {d?.type.displayValue ?? (item && catalog?.types[item.type])}
            </p>
            <h2 id="cz-h" className="dt-name">
              {name}
            </h2>
            {d?.description && <p className="dt-sub">{d.description}</p>}
          </div>
          <button type="button" className="x" onClick={() => ref.current?.close()} aria-label={t("detail.close")}>
            ×
          </button>
        </header>

        <div className="cz-toggles">
          <button type="button" className="btn" aria-pressed={wished} onClick={() => toggle("wish", id)}>
            {wished ? "♥" : "♡"} {t("cos.wish")}
          </button>
          <button type="button" className="btn" aria-pressed={owned} onClick={() => toggle("own", id)}>
            ✓ {t("cos.own")}
          </button>
        </div>

        <ul className="facts">
          {intro && <li>{t("cos.intro", { chapter: intro[0], season: intro[1] })}</li>}
          {(d?.set?.value || (item?.set && catalog?.sets[item.set])) && <li>{t("cos.set", { set: d?.set?.value ?? catalog!.sets[item!.set] })}</li>}
          {item &&
            (item.lastShop ? (
              <>
                <li>{t("cos.lastSeen", { date: fmtDate(lang, item.lastShop), ago: daysSince(item.lastShop) === 0 ? t("cos.inShopToday") : relTime(lang, Date.parse(item.lastShop + "T00:00:00Z")) })}</li>
                <li>{t("cos.times", { n: nf(item.shopCount) })}</li>
              </>
            ) : (
              <li>{t("cos.never")}</li>
            ))}
          {(d?.added || item?.added) && <li>{t("cos.added", { date: fmtDate(lang, (d?.added ?? item!.added).slice(0, 10)) })}</li>}
        </ul>
        {live.loading && !d && <p className="note">{t("common.loading")}</p>}
      </div>
    </dialog>
  );
}
