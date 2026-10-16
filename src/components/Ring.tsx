import type { Season, Sprite } from "../lib/data";
import type { Collection } from "../lib/collection";
import { useI18n } from "../lib/i18n";
import { spriteText } from "../lib/content";

interface Next {
  sprite: Sprite;
  owned: number;
  total: number;
}

/** O elemental mais perto de fechar: o que tem menos figurinhas faltando entre os que você já começou. */
export function closest(season: Season, collection: Collection, unreleased: boolean): Next | null {
  let best: Next | null = null;
  for (const sp of season.sprites) {
    if (sp.unreleased && !unreleased) continue;
    const slots = sp.slots.filter((s) => unreleased || !s.unreleased);
    const owned = slots.filter((s) => (collection[s.id] ?? 0) > 0).length;
    if (!owned || owned === slots.length) continue;
    if (!best || slots.length - owned < best.total - best.owned) best = { sprite: sp, owned, total: slots.length };
  }
  return best;
}

const R = 42;
const CIRC = 2 * Math.PI * R;

/** Progresso da temporada no celular: anel com "X / total" e, ao lado, o próximo elemental para fechar. */
export function Ring({ owned, total, next, hint }: { owned: number; total: number; next: Next | null; hint: string }) {
  const { L, t, nf } = useI18n();
  const pct = total ? owned / total : 0;
  return (
    <div className="ring-box">
      <div className="ring" role="img" aria-label={t("progress.have", { owned: nf(owned), total: nf(total) })}>
        <svg viewBox="0 0 100 100" aria-hidden>
          <circle className="ring-t" cx="50" cy="50" r={R} />
          <circle className="ring-b" cx="50" cy="50" r={R} strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct)} />
        </svg>
        <span className="ring-n" aria-hidden>
          {nf(owned)}
          <small>/ {nf(total)}</small>
        </span>
      </div>
      {(next || hint) && (
        <p className="ring-next">
          {next ? t("album.next", { name: spriteText(L, next.sprite.key).name, owned: nf(next.owned), total: nf(next.total) }) : hint}
        </p>
      )}
    </div>
  );
}
