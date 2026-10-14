import { useMemo } from "react";
import qrcode from "qrcode-generator";

/**
 * QR code em SVG (um quadradinho por módulo, fundo branco). `ecc` L deixa o código menor, para o tamanho pequeno;
 * `margin` é a borda branca em módulos (o padrão do QR pede 4; 2 ainda é lido pelos bancos).
 */
export function PixQr({ data, label, className, ecc = "M", margin = 4 }: { data: string; label: string; className?: string; ecc?: "L" | "M"; margin?: number }) {
  const { path, size } = useMemo(() => {
    const qr = qrcode(0, ecc);
    qr.addData(data);
    qr.make();
    const n = qr.getModuleCount();
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`;
    return { path: d, size: n + margin * 2 };
  }, [data, ecc, margin]);
  return (
    <svg className={className} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#1d1640" />
    </svg>
  );
}
