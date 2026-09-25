import { hideBroken } from "../lib/data";
import { useApi, type NewsMotd } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { Loading } from "../components/Loading";

export function NewsPage() {
  const { t, lang } = useI18n();
  const res = useApi<{ motds?: NewsMotd[] }>("/v2/news/br", lang);
  if (!res.data) return <Loading state={res} />;
  const seen = new Set<string>();
  const items = (res.data.motds ?? []).filter((m) => !seen.has(m.title) && !!seen.add(m.title));
  return (
    <>
      <header className="page-h">
        <h1>{t("news.title")}</h1>
      </header>
      <div className="news">
        {items.map((m) => (
          <article key={m.id}>
            <img src={m.image} alt="" loading="lazy" onError={hideBroken} />
            <div>
              <h2>{m.title}</h2>
              <p>{m.body}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="note src">{t("common.source")}</p>
    </>
  );
}
