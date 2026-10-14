import { useI18n } from "../lib/i18n";
import { useUi } from "../lib/ui";
import { href } from "../lib/router";
import { copyText } from "../lib/clipboard";
import type { PixConfig } from "../lib/pix";
import { PixQr } from "./PixQr";

/**
 * Barrinha de apoio por Pix, em todas as páginas (só em pt-BR e com a chave configurada): QR pequeno que amplia com o
 * mouse, o texto, quem recebe e dois botões de copiar. No celular some o QR (não dá para apontar a câmera para a própria tela).
 */
export function SupportBar({ cfg, code }: { cfg: PixConfig; code: string }) {
  const { t } = useI18n();
  const { toast } = useUi();
  const doCopy = async (text: string) => toast((await copyText(text)) ? t("support.copied") : t("support.copyFail"));
  return (
    <div className="supbar" role="group" aria-label="Pix">
      <a className="supbar-qr" href={href("support")} title={t("support.zoom")}>
        <PixQr data={code} ecc="L" margin={2} label={t("support.qr")} />
      </a>
      <div className="supbar-tx">
        <a className="supbar-t" href={href("support")}>
          <span aria-hidden>♥</span> {t("support.homeLine")}
        </a>
        {cfg.named && <span className="supbar-to">{t("support.to", { name: cfg.name })}</span>}
      </div>
      <div className="supbar-btns">
        <button type="button" className="supbar-btn supbar-main" onClick={() => doCopy(code)} aria-label={t("support.copyCode")} title={t("support.copyCode")}>
          ⧉ {t("support.btnCode")}
        </button>
        <button type="button" className="supbar-btn supbar-key" onClick={() => doCopy(cfg.key)} aria-label={t("support.copyKey")} title={t("support.copyKey")}>
          ⧉ {t("support.btnKey")}
        </button>
      </div>
    </div>
  );
}
