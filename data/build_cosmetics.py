"""Gera o catálogo enxuto de cosméticos a partir da fortnite-api.com.

Saídas (servidas como arquivos estáticos, baixados só quando a página de cosméticos abre):
  public/data/cosmetics/index.json   um item por linha: id, tipo, raridade, conjunto, temporada de estreia,
                                     última vez na loja, vezes na loja, data em que entrou nos arquivos
  public/data/cosmetics/<lang>.json  nomes na mesma ordem do índice + nomes de tipos, raridades e conjuntos

A lista completa da API tem ~23 MB por idioma; o índice fica em ~1 MB e cada idioma em ~300 KB.
Rodar da raiz do projeto: python data/build_cosmetics.py
"""
import gzip
import json
import pathlib
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "cosmetics"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"

# Idiomas que a própria API oferece (os nomes oficiais do jogo).
API_LANGS = ["en", "pt-BR", "es", "es-419", "fr", "de", "it", "pl", "ru", "tr", "ar", "ja", "ko", "zh-Hans", "zh-Hant", "th", "vi", "id"]


def get(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=120) as r:
        raw = r.read()
        if r.headers.get("Content-Encoding") == "gzip":
            raw = gzip.decompress(raw)
    return json.loads(raw)["data"]


def dump(path: pathlib.Path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8", newline="\n")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    base = get("https://fortnite-api.com/v2/cosmetics/br?language=en&responseFlags=4")
    # Mais novos primeiro (entrada nos arquivos), como a maioria das pessoas navega.
    base.sort(key=lambda x: x.get("added") or "", reverse=True)
    ids = [x["id"] for x in base]
    seasons = {}
    rows = []
    for x in base:
        intro = x.get("introduction") or {}
        bv = intro.get("backendValue") or 0
        if bv and intro.get("chapter"):
            seasons[bv] = [intro["chapter"], intro["season"]]
        hist = x.get("shopHistory") or []
        rows.append([
            x["id"],
            x["type"]["value"],
            x["rarity"]["value"],
            (x.get("set") or {}).get("backendValue") or "",
            bv,
            hist[-1][:10] if hist else "",
            len(hist),
            (x.get("added") or "")[:10],
        ])
    dump(OUT / "index.json", {"updated": time.strftime("%Y-%m-%d"), "seasons": seasons, "items": rows})
    print(f"index: {len(rows)} itens")

    for lang in API_LANGS:
        data = base if lang == "en" else get(f"https://fortnite-api.com/v2/cosmetics/br?language={lang}")
        by_id = {x["id"]: x for x in data}
        names, types, rarities, sets = [], {}, {}, {}
        for i in ids:
            x = by_id.get(i)
            names.append(x["name"] if x else "")
            if not x:
                continue
            types.setdefault(x["type"]["value"], x["type"]["displayValue"])
            rarities.setdefault(x["rarity"]["value"], x["rarity"]["displayValue"])
            s = x.get("set") or {}
            if s.get("backendValue"):
                sets.setdefault(s["backendValue"], s.get("value") or s["backendValue"])
        dump(OUT / f"{lang}.json", {"names": names, "types": types, "rarities": rarities, "sets": sets})
        size = (OUT / f"{lang}.json").stat().st_size // 1024
        print(f"{lang}: {size} KB")
        time.sleep(1)


if __name__ == "__main__":
    main()
