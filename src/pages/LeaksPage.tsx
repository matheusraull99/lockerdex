import { useState } from "react";
import { hideBroken } from "../lib/data";
import { useApi, type ApiCosmetic, type ApiTrack } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { useI18n } from "../lib/i18n";
import { useLists } from "../lib/lists";
import { fmtDate } from "../lib/ui";
import { CosmeticCard, CosmeticDialog } from "../components/Cosmetic";
import { Loading } from "../components/Loading";

interface NewItems {
  date: string;
  items: { br?: ApiCosmetic[]; tracks?: ApiTrack[] };
}

export function LeaksPage() {
  const { t, lang, nf } = useI18n();
  const res = useApi<NewItems>("/v2/cosmetics/new", lang);
  const { catalog } = useCatalog(lang);
  const { wish, own, toggle } = useLists();
  const [open, setOpen] = useState<string | null>(null);
  if (!res.data) return <Loading state={res} />;

  const br = res.data.items.br ?? [];
  const tracks = res.data.items.tracks ?? [];
  const never = (id: string) => {
    const it = catalog?.byId.get(id.toLowerCase());
    return !it || it.shopCount === 0;
  };

  return (
    <>
      <header className="page-h">
        <h1>{t("leaks.title")}</h1>
        <p>{t("leaks.intro", { date: fmtDate(lang, res.data.date.slice(0, 10)) })}</p>
      </header>
      <div className="cz-grid">
        {br.map((x) => (
          <CosmeticCard
            key={x.id}
            item={{ id: x.id, name: x.name, rarity: x.rarity.value, type: x.type.value }}
            wished={wish.has(x.id)}
            owned={own.has(x.id)}
            badge={never(x.id) ? t("leaks.never") : undefined}
            onOpen={setOpen}
            onToggle={toggle}
          />
        ))}
      </div>
      {tracks.length > 0 && (
        <section className="shop-sec">
          <h2 className="sec-h">
            {t("leaks.tracks")} <span className="sec-n">{nf(tracks.length)}</span>
          </h2>
          <ul className="track-strip">
            {tracks.map((tr) => (
              <li key={tr.id}>
                <img src={tr.albumArt} alt="" loading="lazy" onError={hideBroken} />
                <span>
                  <b>{tr.title}</b>
                  <small>
                    {tr.artist}
                    {tr.releaseYear ? ` · ${tr.releaseYear}` : ""}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="note src">{t("common.source")}</p>
      {open && <CosmeticDialog id={open} catalog={catalog} onClose={() => setOpen(null)} />}
    </>
  );
}
