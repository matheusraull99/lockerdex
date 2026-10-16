"""Traduz, nos 22 idiomas, os elementais que ainda não têm nome/habilidade em src/i18n/locales.

Fonte do inglês: o nome e a descrição do fortnite.gg (src/data/seasons.json + data/raw/fgg_details.json);
o fortnite.gg só tem os elementais em inglês e o fortnite.com bloqueia robôs, então o texto é traduzido pelo
GitHub Models (gratuito, com o token do GitHub: GITHUB_TOKEN no Actions; aqui, `gh auth token`).
Cada idioma recebe uma chamada com todos os elementais que faltam, com exemplos já traduzidos do próprio
arquivo para manter os termos (ex.: "Sprite" = "elemental" em pt-BR) e o estilo. Idempotente; mantém o
formato dos arquivos (compacto nos traduzidos, expandido em en e pt-BR).
Rodar da raiz do projeto: python data/translate_sprites.py        (--check só testa o acesso ao tradutor)
"""
import json
import os
import pathlib
import re
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
LOC = ROOT / "src" / "i18n" / "locales"
RAW = ROOT / "data" / "raw"
API = "https://models.github.ai/inference/chat/completions"
MODELS = ["openai/gpt-4.1", "openai/gpt-4.1-mini"]  # o segundo é a reserva (limite diário menor no primeiro)
LANGS = {
    "ar": "Arabic", "de": "German", "en": "English", "es": "Spanish (Spain)", "es-419": "Spanish (Latin America)",
    "fr": "French", "hi": "Hindi", "id": "Indonesian", "it": "Italian", "ja": "Japanese", "ko": "Korean",
    "nl": "Dutch", "pl": "Polish", "pt-BR": "Portuguese (Brazil)", "pt-PT": "Portuguese (Portugal)", "ru": "Russian",
    "th": "Thai", "tr": "Turkish", "uk": "Ukrainian", "vi": "Vietnamese", "zh-CN": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
}
q = lambda s: json.dumps(s, ensure_ascii=False)


def token():
    t = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not t:
        t = subprocess.run(["gh", "auth", "token"], capture_output=True, text=True, shell=os.name == "nt").stdout.strip()
    if not t:
        sys.exit("sem token do GitHub (GITHUB_TOKEN ou `gh auth login`)")
    return t


def ask(tok, model, system, user):
    body = {"model": model, "temperature": 0.2, "response_format": {"type": "json_object"},
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    req = urllib.request.Request(API, data=json.dumps(body).encode("utf-8"), method="POST",
                                 headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(json.load(r)["choices"][0]["message"]["content"])


def translate(tok, lang, examples, todo):
    """Devolve {chave: {name, ability[]}} no idioma, ou None se nenhum modelo deu uma resposta válida."""
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
    if lang == "en":
        system = (
            "You edit texts of a fan site about Fortnite Sprites (the collectible creatures). The input is the raw English text "
            "from a tracker site; rewrite it as clean, natural English sentences in the style of the examples (short, in-game tone, "
            "each sentence ending with a period). Keep the name as is.\n"
            "Return ONLY a JSON object with the same keys as the input; each value is {\"name\": string, \"ability\": [strings]} "
            "with exactly the same number of sentences as the input, in the same order.\n\nExamples (raw -> site):\n"
            + "\n".join(q({"raw": e, "site": t}) for e, t in examples)
        )
    for model in MODELS:
        try:
            out = ask(tok, model, system, q(todo))
        except urllib.error.HTTPError as e:
            print(f"  {lang}: {model} respondeu {e.code} ({e.read()[:200].decode('utf-8', 'replace')})")
            continue
        except Exception as e:  # rede, JSON inválido
            print(f"  {lang}: {model} falhou ({e})")
            continue
        ok = all(
            isinstance(out.get(k), dict) and isinstance(out[k].get("name"), str) and out[k]["name"].strip()
            and isinstance(out[k].get("ability"), list) and len(out[k]["ability"]) == len(v["ability"])
            and all(isinstance(a, str) and a.strip() for a in out[k]["ability"])
            for k, v in todo.items()
        )
        if ok:
            return {k: {"name": out[k]["name"].strip(), "ability": [a.strip() for a in out[k]["ability"]]} for k in todo}
        print(f"  {lang}: {model} devolveu um JSON fora do formato")
    return None


def insert(path, entries):
    """Acrescenta as entradas no fim de "sprites" mantendo o formato do arquivo (linha a linha, nunca json.dump)."""
    raw = path.read_text(encoding="utf-8", newline="")
    nl = "\r\n" if "\r\n" in raw else "\n"
    L = raw.split(nl)
    si = next(k for k, l in enumerate(L) if l.startswith('  "sprites"'))
    sc = si
    while not L[sc].startswith("  }"):
        sc += 1
    compact = any('"name"' in l and l.startswith("    ") for l in L[si:sc])  # compacto: entrada inteira numa linha
    new = []
    for key, v in entries.items():
        if compact:
            new.append(f'    {q(key)}: {{ "name": {q(v["name"])}, "ability": [{", ".join(q(a) for a in v["ability"])}] }}')
        else:
            new += [f"    {q(key)}: {{", f'      "name": {q(v["name"])},', '      "ability": [']
            new += ["        " + q(a) + ("," if i < len(v["ability"]) - 1 else "") for i, a in enumerate(v["ability"])]
            new += ["      ]", "    }"]
    ends = [i for i, x in enumerate(new) if x.startswith("    ") and not x.startswith("      ") and (compact or x == "    }")]
    for i in ends[:-1]:
        new[i] += ","
    if sc - 1 > si:  # já havia entradas: vírgula na última
        L[sc - 1] += ","
    L[sc:sc] = new
    out = nl.join(L)
    obj = json.loads(out)
    for key, v in entries.items():
        assert obj["sprites"][key] == v, (path.name, key)
    path.write_text(out, encoding="utf-8", newline="")


def main():
    tok = token()
    if "--check" in sys.argv:
        print(ask(tok, MODELS[0], "Reply with a JSON object {\"ok\": true}.", "ping"))
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
    en = json.loads((LOC / "en.json").read_text(encoding="utf-8"))["sprites"]
    changed = 0
    for lang in sorted(LANGS):
        path = LOC / f"{lang}.json"
        have = json.loads(path.read_text(encoding="utf-8"))["sprites"]
        todo = {k: v for k, v in source.items() if k not in have}
        if not todo:
            continue
        # Exemplos: os últimos elementais já traduzidos (os mais recentes, com o estilo atual), até 6.
        if lang == "en":
            pairs = [(source[k], en[k]) for k in list(en)[::-1] if k in source][:6]
        else:
            pairs = [(en[k], have[k]) for k in list(have)[::-1] if k in en][:6]
        pairs = [(e, {"name": t["name"], "ability": t["ability"]}) for e, t in pairs]
        print(f"{lang}: traduzindo {', '.join(todo)}")
        got = translate(tok, lang, pairs, todo)
        if not got:
            print(f"::warning::{lang}: não traduzi {', '.join(todo)}")
            continue
        insert(path, got)
        changed += 1
        for k, v in got.items():
            print(f"  {k}: {v['name']} — {v['ability'][0][:60]}")
    print(f"{changed} idioma(s) atualizado(s)" if changed else "nada a traduzir")


if __name__ == "__main__":
    main()
