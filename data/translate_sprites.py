"""Traduz, nos 22 idiomas, os elementais que ainda não têm nome/habilidade em src/i18n/locales.

Fonte do inglês: o nome e a descrição do fortnite.gg (src/data/seasons.json + data/raw/fgg_details.json).
O fortnite.gg só tem os elementais em inglês e o fortnite.com bloqueia robôs, então o texto é traduzido por:
  1. Gemini (Google AI Studio, chave gratuita em GEMINI_API_KEY): uma chamada por idioma com exemplos já traduzidos
     do próprio arquivo, para manter os termos (ex.: "Sprite" = "elemental" em pt-BR) e o estilo; traduz o nome
     quando é palavra comum (como "Honey" → "Mel") e mantém nomes próprios.
  2. Sem a chave: o Google Tradutor (endpoint público, sem chave). Traduz só a habilidade, frase a frase; o nome
     fica em inglês. Qualidade menor; os termos do jogo podem sair diferentes do resto do site.
Variantes novas (criadas sozinhas pelo build_data.py): põe o nome traduzido em `variants.<chave>.label` (Gemini;
sem ele, o nome em inglês) e o bônus vazio, que o site mostra como "sem bônus" até alguém escrever.
Idempotente; mantém o formato dos arquivos (compacto nos traduzidos, expandido em en e pt-BR).
Rodar da raiz do projeto: python data/translate_sprites.py        (--check só testa o acesso aos tradutores)
"""
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
LOC = ROOT / "src" / "i18n" / "locales"
RAW = ROOT / "data" / "raw"
GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]  # o segundo é a reserva (limites do plano gratuito)
GTX = "https://translate.googleapis.com/translate_a/single"
MYMEMORY = "https://api.mymemory.translated.net/get"
LANGS = {
    "ar": "Arabic", "de": "German", "en": "English", "es": "Spanish (Spain)", "es-419": "Spanish (Latin America)",
    "fr": "French", "hi": "Hindi", "id": "Indonesian", "it": "Italian", "ja": "Japanese", "ko": "Korean",
    "nl": "Dutch", "pl": "Polish", "pt-BR": "Portuguese (Brazil)", "pt-PT": "Portuguese (Portugal)", "ru": "Russian",
    "th": "Thai", "tr": "Turkish", "uk": "Ukrainian", "vi": "Vietnamese", "zh-CN": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
}
GTX_CODE = {"pt-BR": "pt", "es-419": "es"}  # o Google Tradutor não separa essas variantes
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
q = lambda s: json.dumps(s, ensure_ascii=False)


def http(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, method="POST" if data else "GET", headers={"User-Agent": UA, **(headers or {})})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode("utf-8", "replace")


# ---------- 1. Gemini ----------
def gemini(key, model, system, user):
    body = {"system_instruction": {"parts": [{"text": system}]}, "contents": [{"parts": [{"text": user}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}}
    raw = http(GEMINI.format(model=model), json.dumps(body).encode("utf-8"), {"Content-Type": "application/json", "x-goog-api-key": key})
    try:
        return json.loads(json.loads(raw)["candidates"][0]["content"]["parts"][0]["text"])
    except (ValueError, KeyError, IndexError, TypeError):
        raise RuntimeError(f"resposta inesperada do Gemini: {raw[:200]!r}") from None


def valid(out, todo):
    return isinstance(out, dict) and all(
        isinstance(out.get(k), dict) and isinstance(out[k].get("name"), str) and out[k]["name"].strip()
        and isinstance(out[k].get("ability"), list) and len(out[k]["ability"]) == len(v["ability"])
        and all(isinstance(a, str) and a.strip() for a in out[k]["ability"])
        for k, v in todo.items()
    )


def translate_gemini(key, lang, examples, todo):
    if lang == "en":
        system = (
            "You edit texts of a fan site about Fortnite Sprites (the collectible creatures). The input is the raw English text "
            "from a tracker site; rewrite it as clean, natural English sentences in the style of the examples (short, in-game tone, "
            "each sentence ending with a period). Keep the name as is.\n"
            "Return ONLY a JSON object with the same keys as the input; each value is {\"name\": string, \"ability\": [strings]} "
            "with exactly the same number of sentences as the input, in the same order.\n\nExamples (raw -> site):\n"
            + "\n".join(q({"raw": e, "site": t}) for e, t in examples)
        )
    else:
        system = (
            f"You translate texts of a fan site about Fortnite Sprites (the collectible creatures) into {LANGS[lang]} ({lang}).\n"
            "The examples below are from the same site: copy their terminology exactly (for instance how 'Sprite', 'shield', "
            "'eliminate', 'charges', 'per level' are rendered) and their style (short, in-game tone).\n"
            "Names: keep a name in English when it is a proper name or when the examples keep names in English; translate it when it is a "
            "common word or phrase and the examples do the same for similar names.\n"
            "Return ONLY a JSON object with the same keys as the input; each value is {\"name\": string, \"ability\": [strings]} "
            "with exactly the same number of ability sentences as the input, in the same order. No comments, no extra keys.\n\n"
            "Examples (English -> target):\n" + "\n".join(q({"en": e, lang: t}) for e, t in examples)
        )
    for model in GEMINI_MODELS:
        try:
            out = gemini(key, model, system, q(todo))
        except urllib.error.HTTPError as e:
            print(f"  {lang}: {model} respondeu {e.code} ({e.read()[:200].decode('utf-8', 'replace')})")
            continue
        except Exception as e:
            print(f"  {lang}: {model} falhou ({e})")
            continue
        if valid(out, todo):
            return {k: {"name": out[k]["name"].strip(), "ability": [a.strip() for a in out[k]["ability"]]} for k in todo}
        print(f"  {lang}: {model} devolveu um JSON fora do formato")
    return None


# ---------- 2. Tradutores sem chave: Google Tradutor (endpoint público) e, se ele recusar, MyMemory ----------
def gtx(text, lang):
    qs = urllib.parse.urlencode({"client": "gtx", "sl": "en", "tl": GTX_CODE.get(lang, lang), "dt": "t", "q": text})
    d = json.loads(http(f"{GTX}?{qs}"))
    return "".join(seg[0] for seg in d[0] if seg and seg[0]).strip()


def mymemory(text, lang):
    # Gratuito até 5000 caracteres por dia; o que sobrar fica para a execução do dia seguinte.
    d = json.loads(http(f"{MYMEMORY}?{urllib.parse.urlencode({'q': text, 'langpair': f'en|{lang}'})}"))
    if d.get("responseStatus") != 200 or d.get("quotaFinished"):
        raise RuntimeError(f"MyMemory: {d.get('responseStatus')} {str(d.get('responseDetails', ''))[:80]}")
    return str(d["responseData"]["translatedText"]).strip()


def mt(text, lang, state):
    """Traduz uma frase; lembra em `state` qual tradutor está funcionando para não insistir no que falhou."""
    for name, fn in (("Google Tradutor", gtx), ("MyMemory", mymemory)):
        if name in state["off"]:
            continue
        try:
            out = fn(text, lang)
            if out:
                state["used"].add(name)
                return out
        except Exception as e:
            print(f"  {lang}: {name} falhou ({str(e)[:120]}); passo para o próximo")
        state["off"].add(name)
    raise RuntimeError("nenhum tradutor sem chave respondeu")


def translate_mt(lang, todo, state):
    if lang == "en":
        return todo
    out = {}
    for k, v in todo.items():
        try:
            out[k] = {"name": v["name"], "ability": [mt(a, lang, state) for a in v["ability"]]}
        except Exception as e:
            print(f"  {lang}: {e}")
            return None
        time.sleep(0.3)
    return out if valid(out, todo) else None


# ---------- escrita ----------
def insert(path, entries, section="sprites"):
    """Acrescenta as entradas no fim da seção ("sprites" ou "variants") mantendo o formato do arquivo
    (linha a linha, nunca json.dump)."""
    raw = path.read_text(encoding="utf-8", newline="")
    nl = "\r\n" if "\r\n" in raw else "\n"
    L = raw.split(nl)
    si = next(k for k, l in enumerate(L) if l.startswith(f'  "{section}"'))
    sc = si
    while not L[sc].startswith("  }"):
        sc += 1
    # Compacto: a entrada inteira numa linha ('    "Chave": { "name": ...'); expandido: a chave abre um bloco.
    compact = any(re.match(r'    "[^"]+": \{ "', l) for l in L[si:sc])
    new = []
    for key, v in entries.items():
        if section == "variants":
            if compact:
                new.append(f'    {q(key)}: {{ "label": {q(v["label"])}, "bonus": {q(v["bonus"])} }}')
            else:
                new += [f"    {q(key)}: {{", f'      "label": {q(v["label"])},', f'      "bonus": {q(v["bonus"])}', "    }"]
        elif compact:
            new.append(f'    {q(key)}: {{ "name": {q(v["name"])}, "ability": [{", ".join(q(a) for a in v["ability"])}] }}')
        else:
            new += [f"    {q(key)}: {{", f'      "name": {q(v["name"])},', '      "ability": [']
            new += ["        " + q(a) + ("," if i < len(v["ability"]) - 1 else "") for i, a in enumerate(v["ability"])]
            new += ["      ]", "    }"]
    ends = [i for i, x in enumerate(new) if (compact and x.startswith('    "')) or (not compact and x == "    }")]
    for i in ends[:-1]:
        new[i] += ","
    if sc - 1 > si:  # já havia entradas: vírgula na última
        L[sc - 1] += ","
    L[sc:sc] = new
    out = nl.join(L)
    obj = json.loads(out)
    for key, v in entries.items():
        assert obj[section][key] == v, (path.name, key)
    path.write_text(out, encoding="utf-8", newline="")


def translate_labels(key, lang, examples, todo):
    """Nomes de variantes novas: {chave: nome em inglês} -> {chave: nome no idioma}. Sem Gemini, fica em inglês."""
    if lang == "en" or not key:
        return dict(todo)
    system = (
        f"You translate names of Fortnite Sprite variants (the card types of a collectible album) into {LANGS[lang]} ({lang}). "
        "Follow the examples from the same site: translate a name only when the examples translate similar names; keep "
        "proper names and brand-like names in English. Return ONLY a JSON object with the same keys and string values.\n\n"
        "Examples (English -> target):\n" + "\n".join(q({"en": e, lang: t}) for e, t in examples)
    )
    for model in GEMINI_MODELS:
        try:
            out = gemini(key, model, system, q(todo))
        except Exception as e:
            print(f"  {lang}: {model} falhou ({str(e)[:120]})")
            continue
        if isinstance(out, dict) and all(isinstance(out.get(k), str) and out[k].strip() for k in todo):
            return {k: out[k].strip() for k in todo}
        print(f"  {lang}: {model} devolveu um JSON fora do formato")
    return dict(todo)


def main():
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if "--check" in sys.argv:
        if key:
            print("Gemini:", gemini(key, GEMINI_MODELS[0], "Reply with the JSON object {\"ok\": true}.", "ping"))
        else:
            print("sem GEMINI_API_KEY: só os tradutores sem chave (habilidade traduzida por máquina, nome em inglês)")
        for name, fn in (("Google Tradutor", gtx), ("MyMemory", mymemory)):
            try:
                print(f"{name}:", fn("Push everything away when damaged.", "pt-BR"))
            except Exception as e:
                print(f"{name}: falhou ({str(e)[:120]})")
        return
    seasons = json.loads((ROOT / "src" / "data" / "seasons.json").read_text(encoding="utf-8"))
    f_det = RAW / "fgg_details.json"
    details = json.loads(f_det.read_text(encoding="utf-8")) if f_det.exists() else {}
    source = {}  # chave -> {name, ability[]} em inglês (fortnite.gg)
    for s in seasons:
        for sp in s["sprites"]:
            base = next((sl for sl in sp["slots"] if sl["variant"] == "base"), sp["slots"][0])
            descs = [d.strip() for d in details.get(str(base["fggId"]), {}).get("descs", []) if d.strip()]
            if sp.get("name") and descs:
                source[sp["key"]] = {"name": sp["name"], "ability": [d if d[-1] in ".!?" else d + "." for d in descs]}
            elif sp.get("name"):
                print(f"{sp['key']}: sem descrição em data/raw; fica para a próxima")
    var_source = {v["key"]: v.get("name", v["key"]) for s in seasons for v in s["variants"]}  # chave -> nome em inglês
    en_all = json.loads((LOC / "en.json").read_text(encoding="utf-8"))
    en = en_all["sprites"]
    changed, state = 0, {"off": set(), "used": set()}
    for lang in sorted(LANGS):
        path = LOC / f"{lang}.json"
        loc = json.loads(path.read_text(encoding="utf-8"))
        have = loc["sprites"]
        # Variantes novas: só o nome; o bônus fica vazio (o site mostra "sem bônus") até alguém escrever.
        var_todo = {k: n for k, n in var_source.items() if k not in loc["variants"]}
        if var_todo:
            print(f"{lang}: variante(s) nova(s) {', '.join(var_todo)}")
            pairs = [(en_all["variants"][k]["label"], loc["variants"][k]["label"]) for k in loc["variants"] if k in en_all["variants"]][-8:]
            labels = translate_labels(key, lang, pairs, var_todo)
            insert(path, {k: {"label": labels[k], "bonus": ""} for k in var_todo}, "variants")
            changed += 1
            print("  " + ", ".join(f"{k}: {labels[k]}" for k in var_todo))
        todo = {k: v for k, v in source.items() if k not in have}
        if not todo:
            continue
        print(f"{lang}: traduzindo {', '.join(todo)}")
        got = None
        if key:
            # Exemplos: os últimos elementais já traduzidos (os mais recentes, com o estilo atual), até 6.
            pairs = [(source[k], en[k]) for k in list(en)[::-1] if k in source][:6] if lang == "en" else \
                    [(en[k], have[k]) for k in list(have)[::-1] if k in en][:6]
            got = translate_gemini(key, lang, [(e, {"name": t["name"], "ability": t["ability"]}) for e, t in pairs], todo)
            if got:
                state["used"].add("Gemini")
        if not got:
            got = translate_mt(lang, todo, state)
        if not got:
            print(f"::warning::{lang}: não traduzi {', '.join(todo)}")
            continue
        insert(path, got)
        changed += 1
        for k, v in got.items():
            print(f"  {k}: {v['name']} — {v['ability'][0][:60]}")
    if changed and not key:
        print("::warning::sem GEMINI_API_KEY: nomes ficaram em inglês e a habilidade (se houve) saiu por máquina, com termos do jogo possivelmente diferentes")
    print(f"{changed} idioma(s) atualizado(s) ({', '.join(sorted(state['used'])) or ('Gemini' if key else 'sem tradutor')})" if changed else "nada a traduzir")


if __name__ == "__main__":
    main()
