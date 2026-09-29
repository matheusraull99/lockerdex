import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Personagem do Lockerdex: o Matheus como boneco do Fortnite (render 3D, com o fundo recortado).
 * Aparece ao lado da marca (AvatarBadge) e, de vez em quando, atravessa o rodapé com a picareta (Walker).
 * Arquivos em public/avatar/: bust.webp (cabeça e ombros, 144×144) e walker.webp (corpo inteiro, 166×320).
 * As proporções usadas no CSS (onde as pernas começam, a ponta da picareta) são dessa imagem.
 */
const BASE = `${import.meta.env.BASE_URL}avatar/`;

/** Selo redondo ao lado da marca: o busto sobre a cor de destaque do site. */
export function AvatarBadge({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      <img src={`${BASE}bust.webp`} alt="" width={144} height={144} decoding="async" />
    </span>
  );
}

/**
 * De vez em quando o personagem atravessa o rodapé com a picareta (a primeira vez entre 20 e 40 s,
 * depois a cada 3 a 6 minutos, só com a aba visível). Clicar nele dá uma picaretada. Com "reduzir
 * movimento" ligado no aparelho, ele não aparece.
 */
export function Walker() {
  const [walk, setWalk] = useState<{ dir: 1 | -1; key: number } | null>(null);
  const [swing, setSwing] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  const schedule = useCallback((ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return schedule(30_000);
      setWalk({ dir: Math.random() < 0.5 ? 1 : -1, key: Date.now() });
    }, ms);
  }, []);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // ?walker no endereço: aparece em 1 s (para mostrar a alguém ou testar).
    schedule(new URLSearchParams(location.search).has("walker") ? 1000 : 20_000 + Math.random() * 20_000);
    return () => window.clearTimeout(timer.current);
  }, [schedule]);

  if (!walk) return null;
  const src = `${BASE}walker.webp`;
  return (
    <div
      key={walk.key}
      className="walker"
      data-dir={walk.dir}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return; // só o fim da travessia, não o da picaretada
        setWalk(null);
        schedule(180_000 + Math.random() * 180_000);
      }}
    >
      <button type="button" className="walker-btn" tabIndex={-1} aria-hidden onClick={() => setSwing((n) => n + 1)}>
        {/* A mesma imagem três vezes, cada uma recortada numa parte: as pernas sobem alternadas (passos)
            e o tronco, que segura a picareta, gira na picaretada. */}
        <span className="wk-fig">
          <img className="wk-part wk-leg wk-leg-l" src={src} alt="" draggable={false} />
          <img className="wk-part wk-leg wk-leg-r" src={src} alt="" draggable={false} />
          <span key={swing} className={swing ? "wk-top wk-swing" : "wk-top"}>
            <img className="wk-part" src={src} alt="" draggable={false} />
            {swing > 0 && (
              <svg className="wk-spark" viewBox="138 178 35 36">
                <path d="M150 190 l6 -12 l2 12 l10 -6 l-7 10 l12 2 l-12 3 l6 9 l-9 -5 l-3 11 l-2 -11 l-10 5 l6 -9 l-11 -3 l11 -2 l-6 -9 z" />
              </svg>
            )}
          </span>
        </span>
      </button>
    </div>
  );
}
