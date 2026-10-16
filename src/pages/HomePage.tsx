import { useI18n } from "../lib/i18n";
import { HomeFeature } from "../components/HomeFeature";
import { SeasonCountdown } from "../components/SeasonCountdown";
import { MyAlbumCard, SeasonStrip, TodayChips } from "../components/HomeMobile";
import { MOBILE, useMedia } from "../lib/media";

/**
 * Página inicial: destaques, a contagem da temporada e as fileiras. O álbum fica na aba Elementais.
 * No celular a capa abre no seu álbum, a contagem vira uma linha e entram as fichas de "Hoje no Fortnite".
 */
export function HomePage() {
  const { t } = useI18n();
  const mobile = useMedia(MOBILE);
  return (
    <>
      <h1 className="sr">Lockerdex — {t("app.tagline")}</h1>
      {mobile && <MyAlbumCard />}
      <HomeFeature
        afterHero={
          mobile ? (
            <>
              <SeasonStrip />
              <TodayChips />
            </>
          ) : (
            <section className="home-season">
              <SeasonCountdown heading="h2" />
            </section>
          )
        }
      />
    </>
  );
}
