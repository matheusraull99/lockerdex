"""Sincroniza data/raw (fgg_cards.json e fgg_details.json) com o fortnite.gg.

Baixa https://fortnite.gg/sprites?season=all e, para cada sprite ainda sem detalhe, a página dele.
Confere antes de gravar: os sprites que já estão no src/data/seasons.json (último commit) têm de continuar
com a mesma variante, imagem e elemental. data/raw não vai para o git, então esta conferência evita perder
dados por engano. Rodar da raiz do projeto: python data/sync_fgg.py
Depois: python data/build_data.py && python data/fetch_icons.py
"""
import html
import json
import pathlib
import re
import subprocess
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
RAW = ROOT / "raw"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"


def get(path):
    req = urllib.request.Request("https://fortnite.gg" + path, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8")


page = get("/sprites?season=all")
cards = []
# Os cards de outras temporadas levam a classe is-hidden e a imagem em data-src.
for blk in re.split(r"(?=<div class='sprite-card[^']*')", page)[1:]:
    m = re.match(r"<div class='sprite-card[^']*'([^>]*)>", blk)
    d = dict(re.findall(r"data-([\w-]+)='([^']*)'", m.group(1)))
    d["href"] = re.search(r"<a class='sprite-art[^']*' href='([^']*)'", blk).group(1)
    d["img"] = re.search(r"<img (?:data-)?src='([^']*)'", blk).group(1)
    d["name"] = html.unescape(re.search(r"<a class='sprite-name'[^>]*>([^<]*)<", blk).group(1))
    cards.append(d)

seasons = json.loads(subprocess.run(["git", "show", "HEAD:src/data/seasons.json"], capture_output=True, cwd=ROOT.parent).stdout.decode("utf-8"))
known = {sl["fggId"]: (sl["variant"], sl["img"], sp["key"]) for se in seasons for sp in se["sprites"] for sl in sp["slots"]}
by_id = {int(c["sprite"]): c for c in cards}
bad = [i for i, (v, img, key) in known.items() if i not in by_id or (by_id[i]["variant"], by_id[i]["img"], by_id[i]["parent"]) != (v, img, key)]
assert not bad and len(cards) >= len(known), f"o fortnite.gg mudou ids já conhecidos: {bad[:10]}"
print(f"{len(cards)} cards ({len(cards) - len(known)} novos)")

details = json.loads((RAW / "fgg_details.json").read_text(encoding="utf-8"))
for c in cards:
    if c["sprite"] in details:
        continue
    t = get(c["href"])
    i = t.find("<div class='sprite-detail-panel'>")
    s = t[i : t.find("<div class='sprite-related'>", i)]
    pills = [re.sub("<[^>]+>", "", p) for p in re.findall(r"<span class='sprite-pill[^']*'>(.*?)</span>", s)]
    facts = {html.unescape(a): html.unescape(b) for a, b in re.findall(r"<div class='sprite-fact'><span>(.*?)</span> ?<b>(.*?)</b>", s)}
    details[c["sprite"]] = {
        "descs": [html.unescape(x) for x in re.findall(r"<p class='sprite-desc'>(.*?)</p>", s)],
        "facts": facts,
        "pills": [p for p in pills if p != "Unreleased"],
    }
    time.sleep(0.4)

# Formato dos arquivos atuais: indent 1, CRLF, sem quebra no fim.
for name, obj in (("fgg_cards.json", cards), ("fgg_details.json", details)):
    (RAW / name).write_text(json.dumps(obj, ensure_ascii=False, indent=1).replace("\n", "\r\n"), encoding="utf-8", newline="")
print(f"gravado: {len(cards)} cards, {len(details)} detalhes")
