import type { CSSProperties } from "react";
import { useApi, type MapData } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { hideBroken } from "../lib/data";

/*
 * Fundo das ilhas. A API da Epic não tem imagem de ilha, e as capas do fortnite.com não têm ligação pública
 * com o código. Então: o Battle Royale usa o mapa atual (fortnite-api), que é dele de verdade; as outras ganham
 * uma "ilha vista de cima" desenhada a partir do próprio código (cores, posição e curvas de nível sempre iguais
 * para o mesmo código). Reload, OG e Blitz têm mapas próprios, então também ficam com o desenho.
 */

const BR_CODE = "experience_br";

/** FNV-1a de 32 bits: o mesmo código dá sempre o mesmo desenho. */
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

export function artVars(code: string): CSSProperties {
  const h = hash(code);
  const h1 = h % 360;
  return {
    "--h1": h1,
    "--h2": (h1 + 50 + ((h >>> 9) % 80)) % 360,
    "--x": `${22 + ((h >>> 3) % 56)}%`,
    "--y": `${28 + ((h >>> 13) % 44)}%`,
    "--ring": `${14 + ((h >>> 19) % 12)}px`,
  } as CSSProperties;
}

/** Camada de fundo (posição absoluta): quem usa põe position: relative e overflow: hidden no pai. */
export function IslandArt({ code, className = "" }: { code: string; className?: string }) {
  if (code === BR_CODE || code === "battle-royale") return <MapArt className={className} />;
  return <span className={`isl-art ${className}`} style={artVars(code)} aria-hidden />;
}

function MapArt({ className }: { className: string }) {
  const { lang } = useI18n();
  const map = useApi<MapData>("/v1/map", lang);
  return (
    <span className={`isl-art isl-art-map ${className}`} style={artVars(BR_CODE)} aria-hidden>
      {map.data && <img src={map.data.images.blank} alt="" loading="lazy" decoding="async" onError={hideBroken} />}
    </span>
  );
}
