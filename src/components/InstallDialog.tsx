import { useEffect, useRef } from "react";
import { useI18n } from "../lib/i18n";

/** Passo a passo de instalação para quando o navegador não oferece o botão (iPhone, ou Chrome sem o evento). */
export function InstallDialog({ ios, onClose }: { ios: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const steps = ios ? ["install.ios", "install.android", "install.desktop"] : ["install.android", "install.desktop", "install.ios"];

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="in-h" onClose={onClose} onClick={(e) => e.target === ref.current && ref.current?.close()}>
      <div className="sheet-in">
        <header className="sh-head">
          <h2 id="in-h">{t("install.title")}</h2>
          <button type="button" className="x" onClick={() => ref.current?.close()} aria-label={t("detail.close")}>
            ×
          </button>
        </header>
        <div className="inst-hero" aria-hidden>
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width="72" height="72" />
        </div>
        <p>{t("install.intro")}</p>
        <ul className="inst">
          {steps.map((k, i) => (
            <li key={k} className={i === 0 ? "on" : undefined}>
              {t(k as "install.ios")}
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
