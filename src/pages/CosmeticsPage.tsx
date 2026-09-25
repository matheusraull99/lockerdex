import { useMemo, useState } from "react";
import { useApi, type Shop } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { useI18n } from "../lib/i18n";
import { useLists } from "../lib/lists";
import { fmtDate } from "../lib/ui";
import { CosmeticCard, CosmeticDialog } from "../components/Cosmetic";
import { Loading } from "../components/Loading";

type Sort = "new" | "az" | "recent" | "popular" | "gone";
const PAGE = 60;

const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Ids que estão na loja agora (para o selo "Na loja hoje"). */
export function useShopIds(lang: string) {
  const shop = useApi<Shop>("/v2/shop", lang);
  return useMemo(() => new Set((shop.data?.entries ?? []).flatMap((e) => (e.brItems ?? []).map((b) => b.id.toLowerCase()))), [shop.data]);
}

export function CosmeticsPage({ initialQ = "" }: { initialQ?: string }) {
  const { t, lang, nf } = useI18n();
  const cat = useCatalog(lang);
  const { wish, own, toggle } = useLists();
  const inShop = useShopIds(lang);
  const [q, setQ] = useState(initialQ);
  const [type, setType] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [sort, setSort] = useState<Sort>("new");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const c = cat.catalog;
    if (!c) return [];
    const nq = norm(q.trim());
    let items = c.items.filter(
      (x) => (type === "all" || x.type === type) && (rarity === "all" || x.rarity === rarity) && (!nq || norm(x.name).includes(nq) || x.id.toLowerCase().includes(nq)),
    );
    const collator = new Intl.Collator(lang);
    if (sort === "az") items = [...items].sort((a, b) => collator.compare(a.name, b.name));
    if (sort === "recent") items = items.filter((x) => x.lastShop).sort((a, b) => b.lastShop.localeCompare(a.lastShop));
    if (sort === "popular") items = [...items].sort((a, b) => b.shopCount - a.shopCount);
    if (sort === "gone") items = items.filter((x) => x.lastShop).sort((a, b) => a.lastShop.localeCompare(b.lastShop));
    return items;
  }, [cat.catalog, q, type, rarity, sort, lang]);

  if (!cat.catalog) return <Loading state={{ error: cat.error, retry: cat.retry }} />;
  const c = cat.catalog;
  const byCount = (rec: Record<string, string>, key: keyof (typeof c.items)[number]) => {
    const n = new Map<string, number>();
    c.items.forEach((x) => n.set(x[key] as string, (n.get(x[key] as string) ?? 0) + 1));
    return Object.entries(rec).filter(([k]) => n.has(k)).sort((a, b) => (n.get(b[0]) ?? 0) - (n.get(a[0]) ?? 0));
  };
  const reset = () => setLimit(PAGE);

  return (
    <>
      <header className="page-h">
        <h1>{t("cos.title")}</h1>
        <p>{t("cos.count", { n: nf(list.length), total: nf(c.items.length) })}</p>
      </header>
      <div className="tools" role="search">
        <input className="search" type="search" value={q} placeholder={t("cos.search")} aria-label={t("cos.search")} onChange={(e) => (setQ(e.target.value), reset())} />
        <select value={type} onChange={(e) => (setType(e.target.value), reset())} aria-label={t("cos.typeAll")}>
          <option value="all">{t("cos.typeAll")}</option>
          {byCount(c.types, "type").map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={rarity} onChange={(e) => (setRarity(e.target.value), reset())} aria-label={t("cos.rarityAll")}>
          <option value="all">{t("cos.rarityAll")}</option>
          {byCount(c.rarities, "rarity").map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => (setSort(e.target.value as Sort), reset())} aria-label={t("sort.label")}>
          {(["new", "az", "recent", "popular", "gone"] as Sort[]).map((k) => (
            <option key={k} value={k}>
              {t(`cos.sort.${k}` as "cos.sort.new")}
            </option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <p>{t("empty.filters")}</p>
        </div>
      ) : (
        <div className="cz-grid">
          {list.slice(0, limit).map((x) => (
            <CosmeticCard
              key={x.id}
              item={x}
              wished={wish.has(x.id)}
              owned={own.has(x.id)}
              badge={inShop.has(x.id.toLowerCase()) ? t("cos.inShopToday") : undefined}
              onOpen={setOpen}
              onToggle={toggle}
            />
          ))}
        </div>
      )}
      {list.length > limit && (
        <div className="more-row">
          <button type="button" className="btn" onClick={() => setLimit((l) => l + PAGE * 2)}>
            {t("common.showMore")} ({nf(list.length - limit)})
          </button>
        </div>
      )}
      <p className="note src">
        {t("cos.updated", { date: fmtDate(lang, c.updated) })} · {t("common.source")}
      </p>
      {open && <CosmeticDialog id={open} catalog={c} onClose={() => setOpen(null)} />}
    </>
  );
}
