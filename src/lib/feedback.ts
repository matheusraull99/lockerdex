/*
 * Sugestões de melhoria. Destino configurado no .env, nesta ordem de prioridade:
 *   VITE_FEEDBACK_GFORM + VITE_FEEDBACK_GFORM_FIELDS  Google Forms (grátis, sem limite, respostas numa planilha).
 *                                                    Gerados por: python data/gform_setup.py <link do formulário>
 *   VITE_FEEDBACK_URL    endpoint que recebe POST JSON (Formspree, webhook)
 *   VITE_FEEDBACK_EMAIL  e-mail por mailto (abre o app de e-mail de quem sugere)
 * Sem nenhum deles, o botão de sugestão não aparece.
 */
const GFORM: string | undefined = import.meta.env.VITE_FEEDBACK_GFORM || undefined;
const GFIELDS: string[] = (import.meta.env.VITE_FEEDBACK_GFORM_FIELDS || "").split(",").filter(Boolean);
const ENDPOINT: string | undefined = import.meta.env.VITE_FEEDBACK_URL || undefined;
const EMAIL: string | undefined = import.meta.env.VITE_FEEDBACK_EMAIL || undefined;

const useGForm = !!GFORM && GFIELDS.length >= 2;
export const feedbackEnabled = useGForm || !!ENDPOINT || !!EMAIL;

export type FeedbackKind = "idea" | "bug" | "translation" | "data";

export interface Feedback {
  kind: FeedbackKind;
  message: string;
  contact: string;
  tech?: Record<string, string>;
}

const KIND_PT: Record<FeedbackKind, string> = { idea: "Ideia", bug: "Algo quebrou", translation: "Tradução", data: "Dado de sprite errado" };

const techText = (tech?: Record<string, string>) =>
  tech ? Object.entries(tech).map(([k, v]) => `${k}: ${v}`).join("\n") : "";

/** "sent" quando foi direto para o destino; "mail" quando abriu o app de e-mail. */
export async function sendFeedback(f: Feedback): Promise<"sent" | "mail"> {
  if (useGForm) {
    // Ordem das perguntas no formulário: tipo, sugestão, contato, informações técnicas.
    const values = [KIND_PT[f.kind], f.message, f.contact, techText(f.tech)];
    const body = new URLSearchParams();
    GFIELDS.forEach((entry, i) => values[i] && body.set(entry, values[i]));
    // O Google não libera CORS: a resposta é opaca, mas a gravação acontece.
    // Falha de rede ainda rejeita o fetch e cai na mensagem de erro.
    await fetch(GFORM!, { method: "POST", mode: "no-cors", body });
    return "sent";
  }
  if (ENDPOINT) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ app: "lockerdex", ...f, at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(`feedback ${res.status}`);
    return "sent";
  }
  const lines = [f.message, "", `Tipo: ${KIND_PT[f.kind]}`];
  if (f.contact) lines.push(`Contato: ${f.contact}`);
  if (f.tech) lines.push(techText(f.tech));
  const subject = `[Lockerdex] ${KIND_PT[f.kind]}: ${f.message.slice(0, 60)}`;
  location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  return "mail";
}

export function techInfo(lang: string, season: string): Record<string, string> {
  return {
    Idioma: lang,
    Temporada: season,
    Tela: `${innerWidth}×${innerHeight}`,
    App: matchMedia("(display-mode: standalone)").matches ? "instalado" : "navegador",
    Navegador: navigator.userAgent,
  };
}
