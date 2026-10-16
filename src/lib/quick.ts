/*
 * Botão "Nº" da barra de baixo (celular): abre o "marcar por número" do álbum de qualquer página.
 * Fora do álbum, o pedido fica guardado até a página do álbum montar.
 */
export const QUICK_EVENT = "lockerdex:quick";
let pending = false;

export function requestQuick() {
  pending = true;
  dispatchEvent(new Event(QUICK_EVENT));
}

/** A página do álbum chama ao montar e a cada pedido; devolve true uma vez por pedido. */
export function takeQuick() {
  const was = pending;
  pending = false;
  return was;
}
