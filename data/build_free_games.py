"""Gera os jogos grátis da semana da Epic Games Store a partir do feed público da loja.

O feed (freeGamesPromotions) não libera CORS, então o navegador não consegue buscar direto:
o GitHub Actions roda este script antes de cada build e o site lê o arquivo estático.

Saída: public/data/free-games.json
  games: dados que não mudam com o idioma (id, endereço na loja, imagens, datas, editora)
  text:  por idioma do app, {id: [título, descrição, preço normal formatado na moeda da região]}

Rodar da raiz do projeto: python data/build_free_games.py
"""
import gzip
import json
import pathlib
import re
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data" / "free-games.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"
FEED = "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale={locale}&country={country}&allowCountries={country}"

# Idioma do app → (idioma da loja, país do preço). Onde a loja não tem o idioma, vai em inglês;
# onde a região não tem loja própria, o preço sai em dólar.
LOCALES = {
    "en": ("en-US", "US"), "pt-BR": ("pt-BR", "BR"), "pt-PT": ("pt-BR", "PT"), "es": ("es-ES", "ES"),
    "es-419": ("es-MX", "MX"), "fr": ("fr", "FR"), "de": ("de", "DE"), "it": ("it", "IT"), "nl": ("en-US", "NL"),
    "pl": ("pl", "PL"), "tr": ("tr", "TR"), "ru": ("ru", "US"), "uk": ("en-US", "UA"), "ar": ("ar", "SA"),
    "hi": ("en-US", "IN"), "th": ("th", "TH"), "vi": ("en-US", "VN"), "id": ("en-US", "ID"), "ja": ("ja", "JP"),
    "ko": ("ko", "KR"), "zh-CN": ("zh-CN", "US"), "zh-TW": ("zh-Hant", "TW"),
}


def get(locale: str, country: str):
    req = urllib.request.Request(FEED.format(locale=locale, country=country), headers={"User-Agent": UA, "Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        if r.headers.get("Content-Encoding") == "gzip":
            raw = gzip.decompress(raw)
    return json.loads(raw)["data"]["Catalog"]["searchStore"]["elements"]


def free_offer(e):
    """Promoção de 100% (grátis), agora ou a próxima. Volta (início, fim, já valendo) ou None."""
    promos = e.get("promotions") or {}
    for key, live in (("promotionalOffers", True), ("upcomingPromotionalOffers", False)):
        for group in promos.get(key) or []:
            for o in group.get("promotionalOffers") or []:
                if (o.get("discountSetting") or {}).get("discountPercentage") == 0:
                    return o["startDate"], o["endDate"], live
    return None


def slug(e):
    for m in (e.get("catalogNs") or {}).get("mappings") or []:
        if m.get("pageType") == "productHome" and m.get("pageSlug"):
            return m["pageSlug"]
    for m in e.get("offerMappings") or []:
        if m.get("pageSlug"):
            return m["pageSlug"]
    ps = (e.get("productSlug") or "").removesuffix("/home")
    return ps or None


def image(e, *kinds):
    imgs = {k["type"]: k["url"] for k in e.get("keyImages") or [] if k.get("url")}
    return next((imgs[k] for k in kinds if k in imgs), None)


def main():
    base = get(*LOCALES["en"])
    games = []
    for e in base:
        offer = free_offer(e)
        if not offer:
            continue
        start, end, live = offer
        games.append({
            "id": e["id"],
            "slug": slug(e),
            "wide": image(e, "OfferImageWide", "DieselStoreFrontWide", "Thumbnail"),
            "tall": image(e, "OfferImageTall", "Thumbnail", "DieselStoreFrontTall"),
            "seller": (e.get("seller") or {}).get("name") or "",
            "start": start,
            "end": end,
        })
    games.sort(key=lambda g: g["start"])
    ids = {g["id"] for g in games}

    text = {}
    for lang, (locale, country) in LOCALES.items():
        try:
            els = get(locale, country)
        except Exception as err:  # região sem loja ou fora do ar: fica no inglês
            print(f"{lang}: {err}; usando o inglês")
            els = base
        by_id = {e["id"]: e for e in els}
        text[lang] = {}
        for i in ids:
            # Jogo fora da loja daquela região: nome em inglês e sem preço (não mostrar dólar no lugar do real)
            e = by_id.get(i)
            local = e is not None
            e = e or next(x for x in base if x["id"] == i)
            price = (((e.get("price") or {}).get("totalPrice") or {}).get("fmtPrice") or {}).get("originalPrice") or "" if local else ""
            desc = (e.get("description") or "").strip()
            # Às vezes a Epic põe só o título ou uma lista de etiquetas ("jogos de fuga jogos de..."): sem frase, sem descrição.
            if desc == e["title"] or not re.search(r"[.!?。！？]", desc):
                desc = ""
            text[lang][i] = [e["title"], desc[:240], "" if price in ("0", "R$ 0,00") else price]
        time.sleep(0.3)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    data = {"updated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "games": games, "text": text}
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8", newline="\n")
    print(f"{len(games)} jogos grátis (agora e próximos), {len(text)} idiomas → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
