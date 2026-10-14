import { useI18n } from "../lib/i18n";
import { HomeFeature } from "../components/HomeFeature";

/** Página inicial: destaques da loja, Fortnite agora e notícias, e as fileiras. O álbum fica na aba Elementais. */
export function HomePage() {
  const { t } = useI18n();
  return (
    <>
      <h1 className="sr">Lockerdex — {t("app.tagline")}</h1>
      <HomeFeature />
    </>
  );
}
