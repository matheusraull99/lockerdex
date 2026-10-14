/*
 * Apoio por Pix. A chave, o nome e a cidade vêm do .env (VITE_PIX_KEY, VITE_PIX_NAME, VITE_PIX_CITY) e ficam
 * públicos no site: use uma chave aleatória, não o CPF. Sem chave, nada do apoio aparece.
 * O "Pix Copia e Cola" é o BR Code estático do Banco Central (EMV, com CRC16-CCITT no fim).
 */

export interface PixConfig {
  key: string;
  name: string;
  city: string;
  named: boolean; // o nome veio do .env (senão é o genérico, e a página não o mostra)
}

const env = import.meta.env as Record<string, string | undefined>;

export function pixConfig(): PixConfig | null {
  const key = env.VITE_PIX_KEY?.trim();
  if (!key) return null;
  const name = env.VITE_PIX_NAME?.trim();
  return { key, name: name || "Lockerdex", city: env.VITE_PIX_CITY?.trim() || "Brasil", named: !!name };
}

/** Maiúsculas, sem acento e só o que o BR Code aceita; cortado no limite do campo. */
const clean = (s: string, max: number) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 .\-]/g, "")
    .trim()
    .slice(0, max);

const field = (id: string, value: string) => id + String(value.length).padStart(2, "0") + value;

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), em 4 letras hexadecimais maiúsculas. */
export function crc16(s: string) {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function pixPayload({ key, name, city }: Pick<PixConfig, "key" | "name" | "city">) {
  const mai = field("00", "br.gov.bcb.pix") + field("01", key);
  const body =
    field("00", "01") + // versão do BR Code
    field("01", "11") + // estático: a mesma chave serve para várias pessoas
    field("26", mai) +
    field("52", "0000") +
    field("53", "986") + // real
    field("58", "BR") +
    field("59", clean(name, 25) || "LOCKERDEX") +
    field("60", clean(city, 15) || "BRASIL") +
    field("62", field("05", "***")) +
    "6304";
  return body + crc16(body);
}
