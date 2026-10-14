import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Personagem do Lockerdex: o Matheus como boneco do Fortnite (render 3D, com o fundo recortado).
 * Aparece ao lado da marca (AvatarBadge) e, de vez em quando, atravessa o rodapé com a picareta (Walker).
 * Arquivos em public/avatar/: bust.webp (cabeça e ombros, 144×144) e runner-strip.webp (4 poses da corrida de perfil,
 * 242×300 cada, lado a lado, alinhadas pelo centro da jaqueta).
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
 * De vez em quando o personagem atravessa o rodapé correndo, com a picareta (a primeira vez entre 20 e 40 s,
 * depois a cada 3 a 6 minutos, só com a aba visível). Clicar nele dá um salto mortal. Com "reduzir
 * movimento" ligado no aparelho, ele não aparece.
 */
export function Walker() {
  const [walk, setWalk] = useState<{ dir: 1 | -1; key: number } | null>(null);
  const [hop, setHop] = useState(0);
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
  return (
    <div
      key={walk.key}
      className="walker"
      data-dir={walk.dir}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return; // só o fim da travessia, não o do salto
        setWalk(null);
        schedule(180_000 + Math.random() * 180_000);
      }}
    >
      <button key={hop} type="button" className={hop ? "walker-btn wk-hop" : "walker-btn"} tabIndex={-1} aria-hidden onClick={() => setHop((n) => n + 1)}>
        {/* A tira tem 4 poses da corrida lado a lado; o CSS anda um quadro por vez. */}
        <span className="wk-fig">
          <span className="wk-view">
            <img className="wk-sheet" src={`${BASE}runner-strip.webp`} alt="" draggable={false} />
          </span>
        </span>
      </button>
    </div>
  );
}
