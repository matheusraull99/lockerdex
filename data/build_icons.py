"""Gera os ícones do app (public/) a partir do boneco recortado: "rosto saindo da figurinha" (10/2026).

O boneco fica numa figurinha com o fundo rosa e roxo do app, e a cabeça passa da borda de cima.
Saídas:
  icon-512.png, icon-192.png      ícone comum (cantos arredondados, fundo transparente fora deles)
  apple-touch-icon.png (180)      quadrado e opaco: o iPhone arredonda sozinho
  icon-maskable-512.png           quadrado e opaco, com o desenho menor: o Android corta em círculo (zona segura de 80%)
  icon.svg                        favicon: o PNG de 192 dentro de um SVG
Rodar da raiz do projeto: python data/build_icons.py <lockerdex-boneco-recortado.png>
(o boneco recortado não fica no git; a fonte vem do node_modules)
"""
import base64
import io
import math
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
SRC = pathlib.Path(sys.argv[1])
S = 1024  # desenha grande e reduz no fim
PINK = (255, 61, 139)
PURPLE = (139, 92, 246)
BG1, BG2 = (40, 24, 92), (17, 13, 36)

boneco = Image.open(SRC).convert("RGBA")


def grad(w, h, c1, c2):
    """Degradê diagonal (de cima à esquerda para baixo à direita)."""
    v = Image.linear_gradient("L").resize((w, h))  # 0 em cima → 255 embaixo
    g = Image.blend(v, v.transpose(Image.Transpose.ROTATE_90).transpose(Image.Transpose.FLIP_LEFT_RIGHT).resize((w, h)), 0.5)
    a = Image.new("RGBA", (w, h), c1 + (255,))
    b = Image.new("RGBA", (w, h), c2 + (255,))
    return Image.composite(b, a, g)


def rounded(w, h, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255)
    return m


def content(k):
    """Figurinha + boneco, numa camada transparente S×S; k encolhe o desenho em volta do centro."""
    lay = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    cw, ch = round(660 * k), round(600 * k)
    cx0 = (S - cw) // 2
    cy0 = round(S / 2 + (352 - S / 2) * k)
    # moldura branca com sombra
    fr = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    fr.paste(Image.new("RGBA", (cw, ch), (255, 255, 255, 255)), (0, 0), rounded(cw, ch, round(56 * k)))
    b = round(28 * k)
    fr.paste(grad(cw - 2 * b, ch - 2 * b, PINK, PURPLE), (b, b), rounded(cw - 2 * b, ch - 2 * b, round(36 * k)))
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    m = Image.new("L", (S, S), 0)
    m.paste(fr.getchannel("A"), (cx0, cy0 + round(20 * k)))
    sh.putalpha(m.point(lambda v: v * 110 // 255))
    lay.alpha_composite(sh.filter(ImageFilter.GaussianBlur(28 * k)))
    lay.alpha_composite(fr, (cx0, cy0))
    # boneco: cabeça e ombros; acima da foto aparece tudo (a cabeça sai), dentro dela corta nas bordas
    bust = boneco.crop((370, 70, 1100, 900))
    bw = round(800 * k)
    bust = bust.resize((bw, round(bust.height * bw / bust.width)), Image.LANCZOS)
    body = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    body.alpha_composite(bust, ((S - bw) // 2, round(S / 2 + (80 - S / 2) * k)))
    clip = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(clip)
    d.rectangle((0, 0, S, cy0 + round(120 * k)), fill=255)
    d.rounded_rectangle((cx0 + b, cy0 + b, cx0 + cw - b, cy0 + ch - b), round(36 * k), fill=255)
    body.putalpha(Image.composite(body.getchannel("A"), Image.new("L", (S, S), 0), clip))
    lay.alpha_composite(body)
    return lay


def icon(k):
    im = grad(S, S, BG1, BG2)
    im.alpha_composite(content(k))
    return im


full = icon(1.0)
safe = icon(0.78)  # cabe no círculo de 80% do Android


def save_png(img, name, size, round_corners=False):
    out = img.resize((size, size), Image.LANCZOS)
    if round_corners:
        out.putalpha(rounded(size, size, round(size * 0.22)))
    else:
        out = out.convert("RGB")
    out.save(PUB / name, optimize=True)
    return out


save_png(full, "icon-512.png", 512, round_corners=True)
i192 = save_png(full, "icon-192.png", 192, round_corners=True)
save_png(full, "apple-touch-icon.png", 180)
save_png(safe, "icon-maskable-512.png", 512)
buf = io.BytesIO()
i192.save(buf, "PNG", optimize=True)
svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 192 192" width="192" height="192">'
    f'<image width="192" height="192" href="data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"/></svg>'
)
(PUB / "icon.svg").write_text(svg, encoding="utf-8")
print("ok:", ", ".join(f"{n} {(PUB / n).stat().st_size // 1024} KB" for n in ("icon-512.png", "icon-192.png", "apple-touch-icon.png", "icon-maskable-512.png", "icon.svg")))
