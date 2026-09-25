"""Gera os dados do app a partir do que foi coletado do fortnite.gg (data/raw).

Saídas:
  src/data/seasons.json      dados neutros (ids, raridade, custos, valores por nível, imagens)
  src/i18n/content/pt-BR.json textos dos sprites em português (fonte das traduções)
  src/i18n/content/en.json    textos dos sprites em inglês

Os textos são tradução/reescrita própria dos textos do jogo. Os custos de Pó da
temporada 4 são estimativas da comunidade (o fortnite.gg ainda não os preencheu).
Rodar da raiz do projeto: python data/build_data.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT.parent / "src"
cards = json.loads((ROOT / "raw" / "fgg_cards.json").read_text(encoding="utf-8"))
details = json.loads((ROOT / "raw" / "fgg_details.json").read_text(encoding="utf-8"))

SEASONS = {
    "42": {"code": "C7S4", "chapter": 7, "season": 4, "current": True},
    "41": {"code": "C7S3", "chapter": 7, "season": 3, "current": False},
}

# chave, cor, tem bônus próprio
VARIANTS = {
    "42": [("base", "#9aa6c4"), ("gold", "#f5b642"), ("cheatmaster", "#4fbf1f"), ("hacker", "#4a47e8"), ("reaper", "#f27bd0")],
    "41": [("base", "#9aa6c4"), ("gold", "#f5b642"), ("candy", "#ff6f91"), ("galaxy", "#6d4bff"), ("gem", "#19c2b0"),
           ("holofoil", "#8fd3ff"), ("cube", "#8c6bd8"), ("quack", "#ffd23f")],
}

RARITY_ORDER = ["mythic", "legendary", "epic", "rare"]

# O fortnite.gg lista Overshield como raro; o custo de Pó observado na T4 bate com a
# faixa épica (e o Sprite Locker também o dá como épico).
RARITY_FIX = {"Overshield": "epic"}

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
        if sid == "42":
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
            if sid == "42":
                if vk == "base":
                    cost = 100 if p in T4_STARTERS else T4_COST[rarity]
                else:
                    cost = 1500 if p in T4_STARTERS else round(T4_COST[rarity] * 1.2)
            else:
                cost = num(f.get("Summon Cost"))
            slots.append({"variant": vk, "fggId": int(c["sprite"]), "img": c["img"], "cost": cost,
                          "drop": pct(f.get("Sprite Chest"))})
        sprites.append({
            "key": p,
            "rarity": rarity,
            "levels": LEVELS.get(p),
            "location": location,
            "unreleased": bool(base.get("unreleased")),
            "isNew": bool(base.get("is-new")),
            "slots": slots,
        })
    sprites.sort(key=lambda s: RARITY_ORDER.index(s["rarity"]))
    out.append({
        "id": int(sid), **meta,
        "costSource": "community" if sid == "42" else "game",
        "variants": [{"key": k, "color": col} for k, col in VARIANTS[sid]],
        "sprites": sprites,
    })

(SRC / "data").mkdir(parents=True, exist_ok=True)
(SRC / "data" / "seasons.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8", newline="\n")
for s in out:
    total = sum(len(x["slots"]) for x in s["sprites"])
    live = sum(len(x["slots"]) for x in s["sprites"] if not x["unreleased"])
    print(s["code"], len(s["sprites"]), "sprites,", total, "figurinhas,", live, "lançadas")
print(sorted({x["key"] for s in out for x in s["sprites"]}))
