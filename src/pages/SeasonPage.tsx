import { useEffect, useState } from "react";
import { SEASONS } from "../lib/data";
import { useI18n } from "../lib/i18n";
import { fmtDate, NEXT_SEASON_START, SEASON_END } from "../lib/ui";

const CURRENT = SEASONS.find((s) => s.current) ?? SEASONS[0];

export function SeasonPage() {
  const { t, lang } = useI18n();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const left = Math.max(0, Date.parse(SEASON_END) - now);
  const parts: [number, Intl.NumberFormatOptions["unit"]][] = [
    [Math.floor(left / 86400000), "day"],
    [Math.floor(left / 3600000) % 24, "hour"],
    [Math.floor(left / 60000) % 60, "minute"],
    [Math.floor(left / 1000) % 60, "second"],
  ];

  return (
    <>
      <header className="page-h">
        <h1>{t("season.label", { chapter: CURRENT.chapter, season: CURRENT.season })}</h1>
        <p>{t("season.ends", { date: fmtDate(lang, SEASON_END) })}</p>
      </header>
      <div className="countdown" role="timer" aria-live="off">
        {parts.map(([n, unit]) => {
          const label = new Intl.NumberFormat(lang, { style: "unit", unit, unitDisplay: "long" }).formatToParts(n).filter((p) => p.type === "unit").map((p) => p.value).join("");
          return (
            <div key={unit}>
              <b>{String(n).padStart(2, "0")}</b>
              <span>{label}</span>
            </div>
          );
        })}
      </div>
      <p>{t("season.next", { date: fmtDate(lang, NEXT_SEASON_START) })}</p>
      <p className="note">{t("season.expected")}</p>
    </>
  );
}
