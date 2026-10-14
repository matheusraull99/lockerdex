import { useMemo } from "react";
import { useI18n } from "../lib/i18n";
import { useUi } from "../lib/ui";
import { pixConfig, pixPayload } from "../lib/pix";
import { PixQr } from "../components/PixQr";

/** Copia pelo navegador; se ele recusar (sem permissão), usa o jeito antigo com um campo escondido. */
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export function SupportPage() {
  const { t } = useI18n();
  const { toast } = useUi();
  const cfg = pixConfig();
  const code = useMemo(() => (cfg ? pixPayload(cfg) : ""), [cfg?.key, cfg?.name, cfg?.city]); // eslint-disable-line react-hooks/exhaustive-deps

  const doCopy = async (text: string) => {
    toast((await copy(text)) ? t("support.copied") : t("support.copyFail"));
  };

  return (
    <>
      <header className="page-h">
        <h1>{t("support.title")}</h1>
        <p>{t("support.intro")}</p>
      </header>

      {cfg && (
        <section className="sup" aria-label="Pix">
          <PixQr className="sup-qr" data={code} label={t("support.qr")} />
          <div className="sup-body">
            <p className="sup-scan">{t("support.scan")}</p>
            {cfg.named && <p className="sup-to">{t("support.to", { name: cfg.name })}</p>}
            <div className="sup-btns">
              <button type="button" className="btn btn-dust" onClick={() => doCopy(code)}>
                {t("support.copyCode")}
              </button>
              <button type="button" className="btn" onClick={() => doCopy(cfg.key)}>
                {t("support.copyKey")}
              </button>
            </div>
            <p className="note">{t("support.check")}</p>
          </div>
        </section>
      )}

      <p className="sup-thanks">{t("support.thanks")}</p>
    </>
  );
}
