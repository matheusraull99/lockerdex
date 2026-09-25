import type { CSSProperties } from "react";
import { RARITIES, type Season, type Slot } from "../lib/data";
import type { Collection } from "../lib/collection";
import { useI18n } from "../lib/i18n";
import { rarityLabel, slotLabel, variantText } from "../lib/content";
import { Sticker } from "./Sticker";

export function visibleSlots(season: Season, unreleased: boolean) {
  return season.slots.filter((s) => unreleased || !s.sprite.unreleased);
}

export function counts(slots: Slot[], c: Collection) {
  let owned = 0, mastered = 0, dust = 0;
  for (const s of slots) {
    const st = c[s.id] ?? 0;
    if (st > 0) {
      owned++;
      dust += s.cost;
    }
    if (st === 2) mastered++;
  }
  return { owned, mastered, missing: slots.length - owned, total: slots.length, dust };
}

/** Faixa com todas as figurinhas da temporada, uma por quadradinho. Clicar leva até ela. */
export function Minimap({ slots, collection }: { slots: Slot[]; collection: Collection }) {
  const { L, t } = useI18n();
  const statusLabel = [t("status.missing"), t("status.owned"), t("status.mastered")];
  return (
    <div className="mini" role="list">
      {slots.map((s) => {
        const st = collection[s.id] ?? 0;
        return (
          <a
            key={s.id}
            role="listitem"
            href={`#st-${s.id}`}
            className="mini-c"
            data-status={st}
            data-rarity={s.sprite.rarity}
            title={`${s.no} · ${slotLabel(L, s)} — ${statusLabel[st]}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(`st-${s.id}`);
              el?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
              el?.focus({ preventScroll: true });
            }}
          />
        );
      })}
    </div>
  );
}

export function Stats({ season, slots, collection }: { season: Season; slots: Slot[]; collection: Collection }) {
  const { L, t, nf } = useI18n();
  const colorOf = Object.fromEntries(season.variants.map((v) => [v.key, v.color]));
  const c = counts(slots, collection);

  const bar = (label: string, part: Slot[], color?: string, rarity?: string) => {
    const k = counts(part, collection);
    if (!k.total) return null;
    return (
      <li key={label} className="bar" data-rarity={rarity} style={color ? ({ "--bc": color } as CSSProperties) : undefined}>
        <span className="bar-l">{label}</span>
        <span className="bar-n">
          {k.owned}/{k.total}
        </span>
        <span className="bar-t" aria-hidden>
          <span style={{ width: `${(k.owned / k.total) * 100}%` }} />
        </span>
      </li>
    );
  };

  const hardest = slots
    .filter((s) => !(collection[s.id] ?? 0))
    .sort((a, b) => (a.drop || 999) - (b.drop || 999) || b.cost - a.cost || RARITIES.indexOf(a.sprite.rarity) - RARITIES.indexOf(b.sprite.rarity))
    .slice(0, 5);

  return (
    <div className="stats">
      <h2 className="stats-h">{t("stats.title")}</h2>
      <dl className="kpis">
        <div>
          <dt>{t("progress.mastered")}</dt>
          <dd>{nf(c.mastered)}</dd>
        </div>
        <div>
          <dt>{t("progress.missing")}</dt>
          <dd>{nf(c.missing)}</dd>
        </div>
        <div className="kpi-wide">
          <dt>{t("progress.dust")}</dt>
          <dd>
            {nf(c.dust)}
            {season.costSource === "community" && <small> · {t("detail.costCommunity")}</small>}
          </dd>
        </div>
      </dl>
      <h3>{t("stats.byRarity")}</h3>
      <ul className="bars">{RARITIES.map((r) => bar(rarityLabel(L, r), slots.filter((s) => s.sprite.rarity === r), undefined, r))}</ul>
      <h3>{t("stats.byVariant")}</h3>
      <ul className="bars">
        {season.variants.map((v) => bar(variantText(L, v.key).label, slots.filter((s) => s.variant === v.key), colorOf[v.key]))}
      </ul>
      <h3>{t("stats.hardest")}</h3>
      {hardest.length === 0 ? (
        <p className="done">{t("stats.complete")}</p>
      ) : (
        <ul className="hard">
          {hardest.map((s) => (
            <li key={s.id}>
              <Sticker slot={s} status={0} color={colorOf[s.variant]} label={slotLabel(L, s)} size="sm" />
              <span>
                <b>{slotLabel(L, s)}</b>
                <small>
                  {s.drop ? `${nf(s.drop)}% · ` : ""}
                  <span className="dust-ic" aria-hidden>✦</span> {nf(s.cost)}
                </small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
