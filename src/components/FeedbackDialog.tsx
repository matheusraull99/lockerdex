import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "../lib/i18n";
import { sendFeedback, techInfo, type FeedbackKind } from "../lib/feedback";

interface Props {
  season: string;
  onClose: () => void;
  toast: (msg: string) => void;
}

const KINDS: FeedbackKind[] = ["idea", "bug", "translation", "data"];

export function FeedbackDialog({ season, onClose, toast }: Props) {
  const { t, lang } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const [kind, setKind] = useState<FeedbackKind>("idea");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [tech, setTech] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) {
      setErr(t("feedback.short"));
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const how = await sendFeedback({ kind, message: message.trim(), contact: contact.trim(), tech: tech ? techInfo(lang, season) : undefined });
      toast(how === "sent" ? t("feedback.sent") : t("feedback.mailOpened"));
      ref.current?.close();
    } catch {
      setErr(t("feedback.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="sheet" aria-labelledby="fb-h" onClose={onClose} onClick={(e) => e.target === ref.current && ref.current?.close()}>
      <form className="sheet-in" onSubmit={submit}>
        <header className="sh-head">
          <h2 id="fb-h">{t("feedback.button")}</h2>
          <button type="button" className="x" onClick={() => ref.current?.close()} aria-label={t("detail.close")}>
            ×
          </button>
        </header>
        <p>{t("feedback.intro")}</p>

        <fieldset className="fld fb-kinds">
          <legend>{t("feedback.type")}</legend>
          <div className="chips" role="radiogroup">
            {KINDS.map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>
                {t(`feedback.type.${k}` as "feedback.type.idea")}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="fld">
          <span>{t("feedback.message")}</span>
          <textarea className="fb-msg" rows={5} maxLength={2000} value={message} placeholder={t("feedback.placeholder")} onChange={(e) => setMessage(e.target.value)} required />
        </label>

        <label className="fld">
          <span>{t("feedback.contact")}</span>
          <input value={contact} maxLength={120} onChange={(e) => setContact(e.target.value)} autoComplete="off" />
        </label>

        <label className="toggle">
          <input type="checkbox" checked={tech} onChange={(e) => setTech(e.target.checked)} />
          <span>{t("feedback.tech")}</span>
        </label>

        {err && (
          <small className="err" role="alert">
            {err}
          </small>
        )}

        <button type="submit" className="btn btn-dust" disabled={busy}>
          {t("feedback.send")}
        </button>
      </form>
    </dialog>
  );
}
