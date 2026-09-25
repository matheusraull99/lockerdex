"""Liga as sugestões do Lockerdex a um Google Form.

1. Crie um Google Form com 4 perguntas, NESTA ORDEM, todas do tipo resposta curta ou parágrafo:
   Tipo · Sugestão · Contato · Informações técnicas
2. Em "Enviar" → ícone de link, copie o link do formulário (termina em /viewform).
3. Rode da raiz do projeto:  python data/gform_setup.py "<link>"

O script lê o formulário público, descobre os campos (entry.NNN) e grava no .env.
"""
import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36"


def parse(html: str):
    m = re.search(r"FB_PUBLIC_LOAD_DATA_\s*=\s*(\[.*?\]);\s*</script>", html, re.S)
    if not m:
        raise SystemExit("Não achei os dados do formulário. Confira se o link é o público (termina em /viewform) e se o formulário aceita respostas.")
    data = json.loads(m.group(1))
    questions = []
    for q in data[1][1] or []:
        if len(q) > 4 and q[4]:  # itens sem campo (títulos, imagens) não têm q[4]
            questions.append((q[1], f"entry.{q[4][0][0]}"))
    return questions


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    link = sys.argv[1].strip()
    m = re.search(r"/forms/d/e/([\w-]+)", link)
    if not m:
        raise SystemExit("Use o link público do formulário (…/forms/d/e/<id>/viewform). O link de edição não serve.")
    view = f"https://docs.google.com/forms/d/e/{m.group(1)}/viewform"
    html = urllib.request.urlopen(urllib.request.Request(view, headers={"User-Agent": UA}), timeout=30).read().decode("utf-8")
    questions = parse(html)
    if len(questions) < 2:
        raise SystemExit(f"O formulário precisa de pelo menos 2 perguntas (Tipo e Sugestão); achei {len(questions)}.")
    names = ["Tipo", "Sugestão", "Contato", "Informações técnicas"]
    for i, (title, entry) in enumerate(questions[:4]):
        print(f"  {names[i]:<22} ← pergunta \"{title}\" ({entry})")

    env = ROOT / ".env"
    lines = env.read_text(encoding="utf-8").splitlines() if env.exists() else []
    lines = [l for l in lines if not l.startswith(("VITE_FEEDBACK_GFORM", "VITE_FEEDBACK_EMAIL"))]
    lines += [
        f"VITE_FEEDBACK_GFORM=https://docs.google.com/forms/d/e/{m.group(1)}/formResponse",
        "VITE_FEEDBACK_GFORM_FIELDS=" + ",".join(e for _, e in questions[:4]),
    ]
    env.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print(f"Pronto: .env atualizado. As sugestões agora vão para o formulário (e o e-mail saiu do .env).")


if __name__ == "__main__":
    main()
