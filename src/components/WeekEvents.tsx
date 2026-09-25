import { useEffect, useState } from "react";
import { useI18n } from "../lib/i18n";
import { relTime } from "../lib/ui";
import { weeklyEvents, type EventKey } from "../lib/weekly";

type Key = Parameters<ReturnType<typeof useI18n>["t"]>[0];

/** Faixa "Esta semana": bônus de segunda, elemental novo de quinta e Horas do Poder de sábado. */
export function WeekEvents() {
  const { t, lang } = useI18n();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const day = new Intl.DateTimeFormat(lang, { weekday: "short" });
  const time = new Intl.DateTimeFormat(lang, { hour: "numeric", minute: "2-digit" });
  const list = new Intl.ListFormat(lang, { type: "conjunction" });
  const localWd = new Date(now).getDay();

  return (
    <section className="week" aria-labelledby="week-h">
      <h2 id="week-h" className="week-h">
        {t("week.title")}
      </h2>
      <ol className="week-list">
        {weeklyEvents(now).map((e) => {
          const first = e.windows[0];
          let when: string;
          let status: string;
          if (e.key === "thu") {
            // A Epic não divulga a hora do elemental novo: mostra só o dia, no calendário de quem vê.
            const ahead = (4 - localWd + 7) % 7;
            when = day.format(new Date(now + ahead * 86400_000));
            status = ahead === 0 ? t("week.today") : t("week.starts", { time: relTime(lang, now + ahead * 86400_000, now) });
          } else {
            when = `${day.format(first.start)}, ${list.format(e.windows.map((w) => time.format(w.start)))}`;
            status = e.active ? t("week.now") : t("week.starts", { time: relTime(lang, first.start, now) });
          }
          return (
            <li key={e.key} className="week-ev" data-key={e.key as EventKey} data-active={(e.active && e.key !== "thu") || (e.key === "thu" && localWd === 4) || undefined}>
              <p className="week-when">{when}</p>
              <h3>{t(`week.${e.key}.name` as Key)}</h3>
              <p className="week-desc">{t(`week.${e.key}.desc` as Key)}</p>
              <p className="week-status">{status}</p>
            </li>
          );
        })}
      </ol>
      <p className="note">{t("week.source")}</p>
    </section>
  );
}
