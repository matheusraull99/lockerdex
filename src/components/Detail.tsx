import { useEffect, useRef, useState, type CSSProperties } from "react";
import { hideBroken, imgUrl, type Season, type Sprite, type Status } from "../lib/data";
import type { Collection } from "../lib/collection";
import { useI18n } from "../lib/i18n";
import { levelValues, locationLabel, rarityLabel, spriteText, variantText } from "../lib/content";

interface Props {
  season: Season;
  sprite: Sprite;
  collection: Collection;
  readOnly: boolean;
  onSet: (id: number, st: Status) => void;
  onClose: () => void;
}

export function Detail({ season, sprite, collection, readOnly, onSet, onClose }: Props) {
  const { L, t, nf, lang } = useI18n();
  const [pick, setPick] = useState(sprite.slots[0].id);
  const ref = useRef<HTMLDialogElement>(null);
  const tx = spriteText(L, sprite.key);
  const colorOf = Object.fromEntries(season.variants.map((v) => [v.key, v.color]));
  const cur = sprite.slots.find((s) => s.id === pick) ?? sprite.slots[0];

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    setPick(sprite.slots[0].id);
  }, [sprite]);

  const statusLabel = [t("status.missing"), t("status.owned"), t("status.mastered")];
  const levels = sprite.levels ? levelValues(sprite.levels, lang) : null;

  return (
    <dialog
      ref={ref}
      className="sheet"
      data-rarity={sprite.rarity}
      aria-labelledby="dt-name"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
    >
      <div className="sheet-in">
        <header className="dt-head">
          <div className="dt-art" style={{ "--vc": colorOf[cur.variant] } as CSSProperties}>
            <img key={cur.img} src={imgUrl(cur.img)} alt="" onError={hideBroken} />
          </div>
          <div>
            <p className="dt-rar">
              <span className="rar-dot" aria-hidden />
              {rarityLabel(L, sprite.rarity)}
              {sprite.isNew && <span className="tag tag-new">{t("detail.new")}</span>}
              {sprite.unreleased && <span className="tag">{t("detail.unreleased")}</span>}
            </p>
            <h2 id="dt-name" className="dt-name">
              {tx.name}
            </h2>
            <p className="dt-sub">{variantText(L, cur.variant).label}</p>
          </div>
          <button type="button" className="x" onClick={() => ref.current?.close()} aria-label={t("detail.close")}>
            ×
          </button>
        </header>

        <section>
          <h3>{t("detail.ability")}</h3>
          {tx.ability.map((a) => (
            <p key={a} className="dt-ab">
              {a}
            </p>
          ))}
          {levels && (
            <div className="lv">
              <p className="lv-h">{tx.levels || t("detail.levels")}</p>
              <ol>
                {levels.map((v, i) => (
                  <li key={i}>
                    <span>{t("detail.level", { n: i + 1 })}</span>
                    <b>{v}</b>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        <section>
          <h3>{t("detail.where")}</h3>
          <p>{locationLabel(L, sprite.location)}</p>
        </section>

        <section>
          <h3>{t("detail.variants")}</h3>
          <ul className="vars">
            {sprite.slots.map((s) => {
              const v = variantText(L, s.variant);
              const st = (collection[s.id] ?? 0) as Status;
              return (
                <li key={s.id} className={s.id === cur.id ? "on" : undefined} style={{ "--vc": colorOf[s.variant] } as CSSProperties}>
                  <button type="button" className="var-pick" onClick={() => setPick(s.id)} aria-pressed={s.id === cur.id}>
                    <img src={imgUrl(s.img)} alt="" loading="lazy" onError={hideBroken} />
                    <span className="var-no">{s.no}</span>
                  </button>
                  <div className="var-body">
                    <p className="var-name">{v.label}</p>
                    <p className="var-bonus">{v.bonus || t("detail.noBonus")}</p>
                    <p className="var-facts">
                      <span title={season.costSource === "community" ? t("detail.costCommunity") : undefined}>
                        {t("detail.cost")}: <b>✦ {nf(s.cost)}</b>
                        {season.costSource === "community" && "*"}
                      </span>
                      {s.drop > 0 && (
                        <span>
                          {t("detail.drop")}: <b>{nf(s.drop)}%</b>
                        </span>
                      )}
                    </p>
                    <div className="seg" role="radiogroup" aria-label={`${tx.name} · ${v.label}`}>
                      {([0, 1, 2] as Status[]).map((k) => (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={st === k}
                          disabled={readOnly}
                          data-k={k}
                          onClick={() => onSet(s.id, k)}
                        >
                          {statusLabel[k]}
                        </button>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {season.costSource === "community" && <p className="note">* {t("detail.costCommunity")}</p>}
        </section>
      </div>
    </dialog>
  );
}
