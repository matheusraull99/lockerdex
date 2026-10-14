import { useI18n } from "../lib/i18n";
import { HomeFeature } from "../components/HomeFeature";
import { SeasonCountdown } from "../components/SeasonCountdown";

/** Página inicial: destaques, a contagem da temporada e as fileiras. O álbum fica na aba Elementais. */
export function HomePage() {
  const { t } = useI18n();
  return (
    <>
      <h1 className="sr">Lockerdex — {t("app.tagline")}</h1>
      <HomeFeature
        afterHero={
          <section className="home-season">
            <SeasonCountdown heading="h2" />
          </section>
        }
      />
    </>
  );
}
