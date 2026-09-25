"""Copia os 218 ícones dos sprites para public/icons (uso offline e imagem exportada completa).

Hoje o app carrega as imagens direto do fortnite.gg. Depois de rodar este script,
suba o app com VITE_IMG_BASE=local para usar as cópias locais.
Rodar da raiz do projeto: python data/fetch_icons.py
"""
import json
import pathlib
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
seasons = json.loads((ROOT / "src" / "data" / "seasons.json").read_text(encoding="utf-8"))
dest = ROOT / "public" / "icons"
dest.mkdir(parents=True, exist_ok=True)

paths = sorted({sl["img"] for s in seasons for sp in s["sprites"] for sl in sp["slots"]})
got = 0
for p in paths:
    f = dest / p.split("/")[-1]
    if f.exists():
        continue
    req = urllib.request.Request("https://fortnite.gg" + p, headers={"User-Agent": UA})
    f.write_bytes(urllib.request.urlopen(req, timeout=30).read())
    got += 1
    time.sleep(0.3)
print(f"{got} baixados, {len(paths)} no total em {dest}")
