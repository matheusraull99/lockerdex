"""Gera os dados do app a partir do que foi coletado do fortnite.gg (data/raw).

Saídas:
  src/data/seasons.json      dados neutros (ids, raridade, custos, valores por nível, imagens)
  src/i18n/content/pt-BR.json textos dos sprites em português (fonte das traduções)
  src/i18n/content/en.json    textos dos sprites em inglês

Os textos são tradução/reescrita própria dos textos do jogo. Os custos de Pó da
temporada 4 são estimativas da comunidade (o fortnite.gg ainda não os preencheu).
Rodar da raiz do projeto: python data/build_data.py
"""
import colorsys
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT.parent / "src"
cards = json.loads((ROOT / "raw" / "fgg_cards.json").read_text(encoding="utf-8"))
details = json.loads((ROOT / "raw" / "fgg_details.json").read_text(encoding="utf-8"))

# Temporadas do álbum, da mais nova para a mais antiga. "current" é calculado: a mais nova que já tem figurinhas
# no fortnite.gg (a minitemporada só vira a atual quando os elementais dela aparecerem lá).
# Temporada que o fortnite.gg trouxer e não estiver aqui entra sozinha como minitemporada do capítulo 7 (aviso no log).
SEASONS = {
    "43": {"code": "C7MS", "chapter": 7, "season": 5, "mini": True},  # Treasure Hunters, 01/11 a 05/12/2026
    "42": {"code": "C7S4", "chapter": 7, "season": 4},
    "41": {"code": "C7S3", "chapter": 7, "season": 3},
}
for sid in sorted({c["season"] for c in cards} - set(SEASONS), key=lambda x: -int(x) if x.isdigit() else 0):
    if sid.isdigit() and int(sid) > 41:
        SEASONS[sid] = {"code": f"S{sid}", "chapter": 7, "season": 5, "mini": True}
        print(f"::warning::temporada {sid} do fortnite.gg não estava em SEASONS: entrou como minitemporada do capítulo 7")
SEASONS = {k: v for k, v in sorted(SEASONS.items(), key=lambda kv: -int(kv[0])) if any(c["season"] == k for c in cards)}
for i, meta in enumerate(SEASONS.values()):
    meta["current"] = i == 0

# chave, cor, tem bônus próprio
VARIANTS = {
    "42": [("base", "#9aa6c4"), ("gold", "#f5b642"), ("cheatmaster", "#4fbf1f"), ("hacker", "#4a47e8"), ("reaper", "#f27bd0"),
           ("tricktreat", "#ff7a1a"), ("quack", "#b07cff")],
    "41": [("base", "#9aa6c4"), ("gold", "#f5b642"), ("candy", "#ff6f91"), ("galaxy", "#6d4bff"), ("gem", "#19c2b0"),
           ("holofoil", "#8fd3ff"), ("cube", "#8c6bd8"), ("quack", "#ffd23f")],
}
# Temporada nova começa com Normal e Dourada; as outras variantes entram sozinhas (cor tirada do ícone).
for sid in SEASONS:
    VARIANTS.setdefault(sid, [("base", "#9aa6c4"), ("gold", "#f5b642")])

RARITY_ORDER = ["mythic", "legendary", "epic", "rare"]


def icon_color(img_path, taken):
    """Cor de uma variante nova, tirada do ícone da figurinha: o matiz mais comum entre os pixels vivos,
    clareado para ficar legível no álbum escuro. Se cair perto de uma cor já usada na temporada, gira o matiz."""
    from PIL import Image  # só é preciso quando aparece variante nova (no Actions: pip install pillow)

    f = SRC.parent / "public" / "icons" / img_path.split("/")[-1]
    if not f.exists():
        req = urllib.request.Request("https://fortnite.gg" + img_path, headers={"User-Agent": "Mozilla/5.0"})
        f.write_bytes(urllib.request.urlopen(req, timeout=30).read())
    px = Image.open(f).convert("RGBA").resize((64, 64)).tobytes()
    bins = {}
    for i in range(0, len(px), 4):
        r, g, b, a = px[i : i + 4]
        h, sat, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if a > 200 and sat >= 0.35 and v >= 0.35:
            bins.setdefault(int(h * 24) % 24, []).append(h)
    if not bins:
        return "#9aa6c4"
    hue = (max(bins, key=lambda k: len(bins[k])) + 0.5) / 24
    used = [colorsys.rgb_to_hsv(int(c[1:3], 16) / 255, int(c[3:5], 16) / 255, int(c[5:7], 16) / 255)[0] for c in taken]
    while any(min(abs(hue - u), 1 - abs(hue - u)) < 0.06 for u in used):
        hue = (hue + 0.12) % 1
    return "#%02x%02x%02x" % tuple(round(x * 255) for x in colorsys.hsv_to_rgb(hue, 0.6, 0.97))


# Variantes que ainda não estão em VARIANTS (ex.: um tipo novo de figurinha no meio da temporada) entram
# sozinhas, na ordem em que apareceram no fortnite.gg, com a cor tirada do ícone. Alguém pode depois fixar
# a cor em VARIANTS e escrever o texto do bônus nos idiomas (o tradutor automático só põe o nome).
for sid in SEASONS:
    known = {k for k, _ in VARIANTS[sid]}
    seen = {}
    for c in sorted((c for c in cards if c["season"] == sid), key=lambda c: int(c["sprite"])):
        if c["variant"] not in known and c["variant"] not in seen:
            seen[c["variant"]] = c
    for vk, c in seen.items():
        color = icon_color(c["img"], [col for _, col in VARIANTS[sid]])
        VARIANTS[sid].append((vk, color))
        print(f"::notice::variante nova na temporada {sid}: {vk} ({details[c['sprite']]['facts'].get('Variant', vk)}), cor {color} tirada do ícone")

# Nome em inglês de cada variante (o campo "Variant" do fortnite.gg): o tradutor automático usa para os idiomas.
VARIANT_NAME = {}
for c in cards:
    VARIANT_NAME.setdefault(c["variant"], details[c["sprite"]]["facts"].get("Variant") or c["variant"])

# O fortnite.gg lista Overshield como raro; o custo de Pó observado na T4 bate com a
# faixa épica (e o Sprite Locker também o dá como épico).
RARITY_FIX = {"Overshield": "epic"}

# Já lançados no jogo antes de o fortnite.gg atualizar (lá ainda aparecem como "Unreleased").
# Vazio desde 28/09/2026, quando o fortnite.gg passou a mostrar o Birthday como lançado.
RELEASED_FIX = set()

# Valores por nível (1 → 5). unit vale para todos; units para pares.
LEVELS = {
    "FillerGrunt": {"unit": "s", "values": [3, 3.5, 4, 4.5, 5]},
    "Water": {"unit": "", "values": [2, 3, 4, 5, 6]},
    "Earth": {"unit": "%", "values": [10, 12.5, 15, 17.5, 20]},
    "Spitfire": {"unit": "", "values": [150, 125, 100, 75, 50]},
    "Duck": {"unit": "", "values": [2, 3, 4, 6, 8]},
    "Ghost": {"unit": "s", "values": [3, 3.5, 4, 4.5, 5]},
    "Demon": {"unit": "", "values": [10, 15, 20, 25, 30]},
    "King": {"unit": "", "plus": True, "values": [30, 40, 60, 80, 120]},
    "CokeParmesan": {"units": ["", "%"], "values": [[40, 10], [45, 20], [50, 30], [55, 40], [60, 50]]},
    "BurntPeanut": {"unit": "%", "values": [20, 30, 40, 50, 60]},
    "ZeroPoint": {"unit": "s", "values": [6, 7, 8, 9, 10]},
    "Fishy": {"units": ["%", "%"], "plus": True, "values": [[25, 10], [50, 20], [100, 30], [150, 40], [200, 50]]},
    "Soccer": {"unit": "s", "values": [6, 7, 8, 9, 10]},
    "Drifter": {"unit": "", "values": [175, 150, 125, 100, 75]},
    "Boss": {"unit": "", "plus": True, "values": [5, 10, 15, 20, 25]},
    "Grim": {"unit": "s", "values": [3, 3.5, 4, 4.5, 5]},
    "Seven": {"unit": "s", "values": [10, 15, 20, 25, 30]},
    "PedicureAntacid": {"unit": "", "values": [60, 70, 80, 90, 100]},
    "CompanyStargazer": {"unit": "s", "values": [6, 7, 8, 9, 10]},
    "Llama": {"unit": "%", "values": [5, 10, 15, 17, 20]},
    "Peely": {"unit": "m", "values": [40, 50, 60, 70, 80]},
}

LOCATION_KEY = {
    "Spotted near high and mountainous areas": "mountains",
    "Found in the world at nighttime": "night",
    "Found rarely in Sprite Chests": "spriteChest",
    "Spotted near rivers and beaches": "water",
    "Found wandering around forests and wooded regions": "forest",
    "Located near urban areas": "urban",
    "Found in the vault of a certain business mogul": "vault",
    "Sometimes found sleeping in the storage crates": "crates",
    "Found in Relic Chests": "relicChest",
    "Claimed from defeating a powerful adversary": "boss",
}

# Estimativas da comunidade para a T4 (Pó por invocação).
T4_COST = {"rare": 1250, "epic": 1500, "legendary": 1750, "mythic": 2000}
T4_STARTERS = {"BushRanger", "Dwarf", "Jonesy"}  # os três raros iniciais custam 100
# Temporadas em que o fortnite.gg não preenche o custo de invocação: usa a estimativa da comunidade da T4.
COMMUNITY_COST = {"42", "43"}


def num(s):
    s = (s or "").replace(",", "")
    return int(s) if s.isdigit() else 0


def pct(s):
    try:
        return float(s.rstrip("%"))
    except (ValueError, AttributeError):
        return 0.0


out = []
for sid, meta in SEASONS.items():
    groups, order = {}, []
    for c in cards:
        if c["season"] != sid:
            continue
        p = c["parent"]
        if p not in groups:
            groups[p] = {}
            order.append(p)
        groups[p][c["variant"]] = c
    sprites = []
    for p in order:
        g = groups[p]
        base = g["base"]
        rarity = RARITY_FIX.get(p, base["rarity"])
        loc_en = details[base["sprite"]]["facts"].get("Location", "")
        if sid in COMMUNITY_COST:
            # Na T4 a maioria aparece aleatoriamente; o fortnite.gg repete "montanhas" para quase todos.
            location = "night" if LOCATION_KEY.get(loc_en) == "night" else "random"
        else:
            location = LOCATION_KEY.get(loc_en, "unknown")
        slots = []
        for vk, _ in VARIANTS[sid]:
            c = g.get(vk)
            if not c:
                continue
            f = details[c["sprite"]]["facts"]
            if num(f.get("Summon Cost")) > 0 or sid not in COMMUNITY_COST:
                cost = num(f.get("Summon Cost"))
            elif vk == "base":
                cost = 100 if sid == "42" and p in T4_STARTERS else T4_COST[rarity]
            else:
                cost = 1500 if sid == "42" and p in T4_STARTERS else round(T4_COST[rarity] * 1.2)
            slot = {"variant": vk, "fggId": int(c["sprite"]), "img": c["img"], "cost": cost,
                    "drop": pct(f.get("Sprite Chest"))}
            # Variante que ainda não saiu num elemental que já saiu (ex.: Trick or Treat, a partir de 08/10/2026).
            if c.get("unreleased") and not (base.get("unreleased") and p not in RELEASED_FIX) and f"{p}:{vk}" not in RELEASED_FIX:
                slot["unreleased"] = True
            slots.append(slot)
        sprites.append({
            "key": p,
            "name": base["name"],  # nome em inglês do fortnite.gg: o site usa quando ainda não há tradução
            "rarity": rarity,
            "levels": LEVELS.get(p),
            "location": location,
            "unreleased": bool(base.get("unreleased")) and p not in RELEASED_FIX,
            "isNew": bool(base.get("is-new")),
            "slots": slots,
        })
    sprites.sort(key=lambda s: RARITY_ORDER.index(s["rarity"]))
    out.append({
        "id": int(sid), **meta,
        "costSource": "community" if sid in COMMUNITY_COST else "game",
        "variants": [{"key": k, "color": col, "name": VARIANT_NAME.get(k, k)} for k, col in VARIANTS[sid]],
        "sprites": sprites,
    })

(SRC / "data").mkdir(parents=True, exist_ok=True)
(SRC / "data" / "seasons.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
for s in out:
    total = sum(len(x["slots"]) for x in s["sprites"])
    live = sum(len(x["slots"]) for x in s["sprites"] if not x["unreleased"])
    print(s["code"], len(s["sprites"]), "sprites,", total, "figurinhas,", live, "lançadas")
print(sorted({x["key"] for s in out for x in s["sprites"]}))
