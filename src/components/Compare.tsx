import type { Season, Slot } from "../lib/data";
import type { Collection } from "../lib/collection";
import { useI18n } from "../lib/i18n";
import { slotLabel } from "../lib/content";
import { Sticker } from "./Sticker";

interface Props {
  season: Season;
  slots: Slot[];
  mine: Collection;
  theirs: Collection;
  name: string;
}

export function Compare({ season, slots, mine, theirs, name }: Props) {
  const { L, t } = useI18n();
  const colorOf = Object.fromEntries(season.variants.map((v) => [v.key, v.color]));
  const has = (c: Collection, s: Slot) => (c[s.id] ?? 0) > 0;
  const theyHave = slots.filter((s) => has(theirs, s) && !has(mine, s));
  const youHave = slots.filter((s) => has(mine, s) && !has(theirs, s));

  const list = (items: Slot[], from: Collection) =>
    items.length === 0 ? (
      <p className="note">{t("compare.none")}</p>
    ) : (
      <ul className="cmp-list">
        {items.map((s) => (
          <li key={s.id}>
            <Sticker slot={s} status={from[s.id] ?? 0} color={colorOf[s.variant]} label={`${s.no} · ${slotLabel(L, s)}`} size="sm" />
          </li>
        ))}
      </ul>
    );

  return (
    <section className="cmp" aria-label={t("compare.button")}>
      <div>
        <h3>
          {t("compare.theyHave", { name })} <span className="cmp-n">{theyHave.length}</span>
        </h3>
        {list(theyHave, theirs)}
      </div>
      <div>
        <h3>
          {t("compare.youHave", { name })} <span className="cmp-n">{youHave.length}</span>
        </h3>
        {list(youHave, mine)}
      </div>
    </section>
  );
}
