"""Gera public/avatar/runner-strip.webp (4 poses da corrida lado a lado) a partir da folha de poses do boneco.

Entrada: a folha de poses (fundo azul liso, uma pose por figura), por padrão
  Downloads/lockerdex-boneco-correndo-folha.jpg  (6 poses; usamos 3 distintas)
Passos: tira o fundo azul (chave de cor com despill), separa cada figura (componentes conectados), iguala a escala pela
altura do tronco (topo da cabeça até a barra da jaqueta), alinha pelo centro da jaqueta (o corpo não treme; só pernas e
braços mudam) e monta a tira na ordem ORDER (cada figura é "quadro" na ordem de leitura: linha de cima, esq→dir, depois a de baixo).
Rodar da raiz do projeto: python data/build_runner_strip.py [caminho-da-folha.jpg]
"""
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path.home() / "Downloads" / "lockerdex-boneco-correndo-folha.jpg"
OUT = ROOT / "public" / "avatar" / "runner-strip.webp"
# Quadros (índice na ordem de leitura das 6 figuras da folha) que entram na corrida, e a ordem. 0 = impulso, 1 = passagem,
# 2 = passada grande; 3 e 5 repetem o 0; 4 tem a picareta no ombro (fora).
USE = [0, 1, 2]
ORDER = [0, 1, 2, 1]
CELL_H = 300

im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(float)
border = np.concatenate([a[:15].reshape(-1, 3), a[-15:].reshape(-1, 3), a[:, :15].reshape(-1, 3), a[:, -15:].reshape(-1, 3)])
key = np.median(border, axis=0)
alpha = np.clip((np.sqrt(((a - key) ** 2).sum(axis=2)) - 38) / (95 - 38), 0, 1)
lab, n = ndi.label(ndi.binary_dilation(alpha > 0.5, iterations=18))
sizes = [(i, int(((lab == i) & (alpha > 0.5)).sum())) for i in range(1, n + 1)]
comps = [i for i, s in sizes if s > 20000]
objs = {i: ndi.find_objects(lab)[i - 1] for i in comps}
# ordem de leitura: linhas (y do centro) e depois x
cy = {i: (objs[i][0].start + objs[i][0].stop) / 2 for i in comps}
rows = sorted(comps, key=lambda i: cy[i])
half = len(rows) // 2 or 1
reading = sorted(rows[:half], key=lambda i: objs[i][1].start) + sorted(rows[half:], key=lambda i: objs[i][1].start)
print(f"{len(reading)} figuras na folha")

hsv = np.asarray(im.convert("HSV")).astype(float)
jack = (hsv[..., 0] > 40) & (hsv[..., 0] < 85) & (hsv[..., 1] > 50) & (hsv[..., 1] < 170) & (hsv[..., 2] > 60) & (hsv[..., 2] < 190)
frames = {}
for k in USE:
    i = reading[k]
    m = ndi.binary_dilation(lab == i, iterations=3)
    al = alpha * m
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    edge = (al > 0) & (al < 0.98)
    lim = np.maximum(r, g)
    bn = np.where(edge & (b > lim), lim + (b - lim) * 0.15, b)  # tira o azul que sobra na borda
    rgba = np.dstack([r, g, bn, al * 255]).clip(0, 255).astype(np.uint8)
    ys, xs = np.where(al > 0.03)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    jy, jx = np.where(jack & (lab == i))
    frames[k] = (Image.fromarray(rgba, "RGBA").crop(box), jy.max() - box[1], jx.mean() - box[0], jy.mean() - box[1])
T = np.mean([v[1] for v in frames.values()])
sf = {}
for k, (f, hem, cx, cyy) in frames.items():
    s = T / hem
    sf[k] = (f.resize((round(f.width * s), round(f.height * s)), Image.LANCZOS), cx * s, cyy * s)
L = max(v[1] for v in sf.values())
R = max(v[0].width - v[1] for v in sf.values())
U = max(v[2] for v in sf.values())
D = max(v[0].height - v[2] for v in sf.values())
W, H = int(np.ceil(L + R)), int(np.ceil(U + D))
cells = {}
for k, (f, cx, cyy) in sf.items():
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    c.alpha_composite(f, (int(round(L - cx)), int(round(U - cyy))))
    cells[k] = c.resize((round(W * CELL_H / H), CELL_H), Image.LANCZOS)
fw = cells[USE[0]].width
strip = Image.new("RGBA", (fw * len(ORDER), CELL_H), (0, 0, 0, 0))
for j, k in enumerate(ORDER):
    strip.alpha_composite(cells[k], (j * fw, 0))
strip.save(OUT, quality=90, method=6)
print(f"{OUT} {strip.size} (quadro {fw}x{CELL_H}, razão {fw / CELL_H:.3f}); o CSS usa aspect-ratio 242 / 300")
