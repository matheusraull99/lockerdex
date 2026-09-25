import { useI18n } from "../lib/i18n";

/** Estado de carregamento / erro das páginas que buscam dados ao vivo. */
export function Loading({ state }: { state: { loading?: boolean; error?: boolean; retry?: () => void } }) {
  const { t } = useI18n();
  if (state.error)
    return (
      <div className="empty" role="alert">
        <p>{t("common.error")}</p>
        {state.retry && (
          <button type="button" className="btn" onClick={state.retry}>
            {t("common.retry")}
          </button>
        )}
      </div>
    );
  return (
    <div className="empty" aria-busy="true">
      <p>{t("common.loading")}</p>
    </div>
  );
}
