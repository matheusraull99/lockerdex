import { RARITIES, type Rarity, type Season, type Slot, type Sprite } from "../lib/data";
import type { Collection } from "../lib/collection";
import { useI18n } from "../lib/i18n";
import { rarityLabel, spriteText, variantText } from "../lib/content";
import { Sticker } from "./Sticker";
import en from "../i18n/locales/en.json";

export type StatusFilter = "all" | "owned" | "missing" | "mastered";
export type SortKey = "album" | "az" | "closest" | "cost";

export interface Filters {
  status: StatusFilter;
  rarity: "all" | Rarity;
  variant: string;
  q: string;
  sort: SortKey;
  unreleased: boolean;
}

export const DEFAULT_FILTERS: Filters = { status: "all", rarity: "all", variant: "all", q: "", sort: "album", unreleased: false };

interface Props {
  season: Season;
  collection: Collection;
  filters: Filters;
  readOnly: boolean;
  onCycle: (slot: Slot) => void;
  onOpen: (sprite: Sprite) => void;
  onClear: () => void;
}

function norm(s: string) {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function Album({ season, collection, filters, readOnly, onCycle, onOpen, onClear }: Props) {
  const { L, t, lang } = useI18n();
  const colorOf = Object.fromEntries(season.variants.map((v) => [v.key, v.color]));
  const statusLabel = [t("status.missing"), t("status.owned"), t("status.mastered")];
  const q = norm(filters.q.trim());

  const slotOk = (s: Slot) => {
    const st = collection[s.id] ?? 0;
    if (filters.variant !== "all" && s.variant !== filters.variant) return false;
    if (filters.status === "owned") return st >= 1;
    if (filters.status === "missing") return st === 0;
    if (filters.status === "mastered") return st === 2;
    return true;
  };

  const rows = season.sprites
    .filter((sp) => filters.unreleased || !sp.unreleased)
    .filter((sp) => filters.rarity === "all" || sp.rarity === filters.rarity)
    .filter((sp) => !q || norm(spriteText(L, sp.key).name).includes(q) || norm(sp.key).includes(q) || norm(spriteText(en, sp.key).name).includes(q))
    .map((sp) => ({ sp, slots: sp.slots.filter(slotOk) }))
    .filter((r) => r.slots.length > 0);

  const owned = (sp: Sprite) => sp.slots.filter((s) => (collection[s.id] ?? 0) > 0).length;
  const collator = new Intl.Collator(lang);
  if (filters.sort === "az") rows.sort((a, b) => collator.compare(spriteText(L, a.sp.key).name, spriteText(L, b.sp.key).name));
  if (filters.sort === "closest")
    rows.sort((a, b) => {
      const ra = owned(a.sp) / a.sp.slots.length, rb = owned(b.sp) / b.sp.slots.length;
      const fa = ra === 1 ? -1 : ra, fb = rb === 1 ? -1 : rb; // completos vão para o fim
      return fb - fa;
    });
  if (filters.sort === "cost") rows.sort((a, b) => Math.max(...b.sp.slots.map((s) => s.cost)) - Math.max(...a.sp.slots.map((s) => s.cost)));

  if (rows.length === 0)
    return (
      <div className="empty">
        <p>{t("empty.filters")}</p>
        <button type="button" className="btn" onClick={onClear}>
          {t("filter.clear")}
        </button>
      </div>
    );

  const groups: { rarity: Rarity | null; rows: typeof rows }[] =
    filters.sort === "album"
      ? RARITIES.map((r) => ({ rarity: r, rows: rows.filter((x) => x.sp.rarity === r) })).filter((g) => g.rows.length)
      : [{ rarity: null, rows }];

  return (
    <div className="album">
      {groups.map((g) => {
        const all = g.rarity ? season.sprites.filter((s) => s.rarity === g.rarity && (filters.unreleased || !s.unreleased)) : [];
        const tot = all.reduce((n, s) => n + s.slots.length, 0);
        const got = all.reduce((n, s) => n + owned(s), 0);
        return (
          <section key={g.rarity ?? "flat"} className="sec" data-rarity={g.rarity ?? undefined}>
            {g.rarity && (
              <h2 className="sec-h">
                <span>{rarityLabel(L, g.rarity)}</span>
                <span className="sec-n">
                  {got}/{tot}
                </span>
              </h2>
            )}
            {g.rows.map(({ sp, slots }) => {
              const tx = spriteText(L, sp.key);
              return (
                <article key={sp.key} className="row" data-rarity={sp.rarity}>
                  <button type="button" className="ficha" onClick={() => onOpen(sp)} aria-label={t("detail.open", { name: tx.name })}>
                    <span className="ficha-name">{tx.name}</span>
                    <span className="ficha-meta">
                      <span className="rar-dot" aria-hidden />
                      {rarityLabel(L, sp.rarity)}
                      <span className="ficha-count">
                        {owned(sp)}/{sp.slots.length}
                      </span>
                      {sp.isNew && <span className="tag tag-new">{t("detail.new")}</span>}
                      {sp.unreleased && <span className="tag">{t("detail.unreleased")}</span>}
                    </span>
                    <span className="ficha-ab">{tx.ability[0]}</span>
                  </button>
                  <div className="row-st">
                    {slots.map((s) => {
                      const st = collection[s.id] ?? 0;
                      return (
                        <div key={s.id} className="cell">
                          <Sticker
                            slot={s}
                            status={st}
                            color={colorOf[s.variant]}
                            label={t("sticker.aria", { n: s.no, name: tx.name, variant: variantText(L, s.variant).label, status: statusLabel[st] })}
                            onCycle={readOnly ? undefined : onCycle}
                          />
                          <span className="cell-var">{variantText(L, s.variant).label}</span>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
