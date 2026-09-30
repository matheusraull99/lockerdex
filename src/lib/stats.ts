/** Contador de visitas (GoatCounter): sem cookies, sem dado pessoal. O script fica no index.html. */
interface Count {
  path: string;
  title?: string;
  event?: boolean;
}

/** Manda a contagem; se o script ainda não carregou, espera a página carregar. ?walker é teste e não conta. */
export function gcCount(o: Count) {
  if (/[?&]walker\b/.test(location.search)) return;
  const send = () => (window as { goatcounter?: { count?: (o: Count) => void } }).goatcounter?.count?.(o);
  if (document.readyState === "complete") send();
  else addEventListener("load", send, { once: true });
}

/** Evento contado no máximo uma vez por dia neste aparelho. */
export function gcEventDaily(name: string, title: string) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `lockerdex:gc:${name}`;
  try {
    if (localStorage.getItem(key) === day) return;
    localStorage.setItem(key, day);
  } catch {
    // sem localStorage (janela privada): conta só esta abertura
  }
  gcCount({ path: name, title, event: true });
}
