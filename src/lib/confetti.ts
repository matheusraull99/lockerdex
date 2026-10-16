import { reducedMotion } from "./media";

/*
 * Confete curto saindo de um elemento (elemental completo; dourado quando tudo foi dominado).
 * Um canvas por cima da página, criado na hora e removido quando os papéis caem.
 */
const FESTA = ["#ff5c9f", "#8b73ff", "#2e9bff", "#f2b705", "#4fbf1f"];
const OURO = ["#f2b705", "#ffd96a", "#fff4c2", "#ff5c9f"];

export function confetti(from: Element | null, gold = false) {
  if (!from || reducedMotion()) return;
  const cv = document.createElement("canvas");
  cv.className = "confetti";
  cv.setAttribute("aria-hidden", "true");
  const dpr = devicePixelRatio || 1;
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  document.body.appendChild(cv);
  const cx = cv.getContext("2d");
  if (!cx) return cv.remove();
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = from.getBoundingClientRect();
  const x0 = r.left + r.width / 2;
  const y0 = r.top + r.height / 2;
  const cols = gold ? OURO : FESTA;
  const parts = Array.from({ length: 46 }, (_, i) => {
    const a = Math.random() * Math.PI * 2;
    const sp = 4 + Math.random() * 6;
    return { x: x0, y: y0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3, w: 4 + Math.random() * 5, h: 3 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length], life: 60 + Math.random() * 30 };
  });
  const step = () => {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    let alive = 0;
    for (const p of parts) {
      if (p.life-- <= 0) continue;
      alive++;
      p.vy += 0.22;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.vx *= 0.985;
      cx.save();
      cx.translate(p.x, p.y);
      cx.rotate(p.rot);
      cx.globalAlpha = Math.min(1, p.life / 20);
      cx.fillStyle = p.c;
      cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cx.restore();
    }
    if (alive) requestAnimationFrame(step);
    else cv.remove();
  };
  requestAnimationFrame(step);
}
