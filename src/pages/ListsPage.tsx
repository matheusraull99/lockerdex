import { useMemo, useState } from "react";
import { useCatalog, type Item } from "../lib/catalog";
import { useI18n } from "../lib/i18n";
import { decodeHashes, encodeIds, idHash, useLists } from "../lib/lists";
import { go, href, SLUG } from "../lib/router";
import { storage } from "../lib/collection";
import { useUi } from "../lib/ui";
import { CosmeticCard, CosmeticDialog } from "../components/Cosmetic";
import { Loading } from "../components/Loading";
import { useShopIds } from "./CosmeticsPage";

type Tab = "wish" | "own";

export function ListsPage({ params }: { params: URLSearchParams }) {
  const { t, lang, nf } = useI18n();
  const { toast } = useUi();
  const cat = useCatalog(lang);
  const { lists, toggle, clear, wish, own } = useLists();
  const inShop = useShopIds(lang);
  const [tab, setTab] = useState<Tab>(params.get("tab") === "own" ? "own" : "wish");
  const [open, setOpen] = useState<string | null>(null);

  // Listas de um amigo (#/lists?w=…&k=…&n=…)
  const shared = params.has("w") || params.has("k");
  const friend = useMemo(() => {
    if (!shared || !cat.catalog) return null;
    const byHash = new Map(cat.catalog.items.map((x) => [idHash(x.id), x.id]));
    const ids = (code: string | null) => decodeHashes(code ?? "").map((h) => byHash.get(h)).filter(Boolean) as string[];
    return { wish: ids(params.get("w")), own: ids(params.get("k")), name: params.get("n") || t("compare.friend") };
  }, [shared, cat.catalog, params, t]);

  if (!cat.catalog) return <Loading state={{ error: cat.error, retry: cat.retry }} />;
  const c = cat.catalog;
  const ids = friend ? friend[tab] : lists[tab];
  const items = ids.map((id) => c.byId.get(id.toLowerCase())).filter(Boolean) as Item[];
  // Na lista de desejos, o que está na loja hoje vem primeiro.
  if (tab === "wish") items.sort((a, b) => Number(inShop.has(b.id.toLowerCase())) - Number(inShop.has(a.id.toLowerCase())));

  const share = async () => {
    const p = new URLSearchParams();
    if (lists.wish.length) p.set("w", encodeIds(lists.wish));
    if (lists.own.length) p.set("k", encodeIds(lists.own));
    const name = storage.name();
    if (name) p.set("n", name);
    // Os ids ficam no "#": não vão para o servidor e o endereço da página continua limpo.
    const url = `${location.origin}${import.meta.env.BASE_URL}${SLUG.lists}/#${p.toString()}`; // sem prefixo de idioma: quem abre vê no idioma dele
    try {
      if (navigator.share) await navigator.share({ title: t("lists.share"), url });
      else {
        await navigator.clipboard.writeText(url);
        toast(t("share.copied"));
      }
    } catch {
      /* compartilhamento cancelado */
    }
  };

  return (
    <>
      <header className="page-h">
        <h1>{friend ? t("lists.viewing", { name: friend.name }) : t("nav.lists")}</h1>
        {!friend && (lists.wish.length > 0 || lists.own.length > 0) && (
          <button type="button" className="btn btn-dust" onClick={share}>
            {t("lists.share")}
          </button>
        )}
        {friend && (
          <a className="btn" href={href("lists")}>
            {t("lists.back")}
          </a>
        )}
      </header>

      <div className="chips tabs" role="tablist">
        {(["wish", "own"] as Tab[]).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} aria-checked={tab === k} onClick={() => setTab(k)}>
            {k === "wish" ? "♥ " + t("lists.wishlist") : "✓ " + t("lists.locker")} · {nf((friend ? friend[k] : lists[k]).length)}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <p>{tab === "wish" ? t("lists.emptyWish") : t("lists.emptyLocker")}</p>
          <button type="button" className="btn" onClick={() => go("cosmetics")}>
            {t("lists.browse")}
          </button>
        </div>
      ) : (
        <div className="cz-grid">
          {items.map((x) => (
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

      {!friend && items.length > 0 && (
        <div className="more-row">
          <button type="button" className="btn btn-quiet" onClick={() => confirm(t("lists.clearConfirm")) && clear(tab)}>
            {t("lists.clear")}
          </button>
        </div>
      )}
      {open && <CosmeticDialog id={open} catalog={c} onClose={() => setOpen(null)} />}
    </>
  );
}
