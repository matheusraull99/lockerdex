import { useI18n } from "../lib/i18n";
import { href } from "../lib/router";
import { pixConfig } from "../lib/pix";
import { HomeFeature } from "../components/HomeFeature";
import { SeasonCountdown } from "../components/SeasonCountdown";

/** Página inicial: destaques, a contagem da temporada e as fileiras. O álbum fica na aba Elementais. */
export function HomePage() {
  const { t, lang } = useI18n();
  return (
    <>
      <h1 className="sr">Lockerdex — {t("app.tagline")}</h1>
      {/* Apoio por Pix: uma linha pequena acima do destaque (só em pt-BR e só com a chave configurada). */}
      {lang === "pt-BR" && pixConfig() && (
        <p className="home-support">
          <a href={href("support")}>
            <span aria-hidden>♥</span> {t("support.homeLine")}
          </a>
        </p>
      )}
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
