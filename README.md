# Lockerdex

Portal de Fortnite com cara de álbum de figurinhas (o álbum dos Sprites começou como "Spritedex"): sprites, loja, cosméticos, listas, Jam Tracks, mapa, notícias e temporada. Você marca o que tem, vê o que falta e compara com os amigos. Tem 22 idiomas, não tem anúncio, não pede login e funciona offline.

Junta o melhor de [fortnite.gg/sprites](https://fortnite.gg/sprites) (catálogo completo e histórico) e do [Sprite Locker](https://spritelocker.com) (matriz sprite × variante e ferramentas de colecionador), e acrescenta:

- **Álbum numerado:** cada sprite em cada variante é uma figurinha com número. Quando falta, mostra a silhueta; quando você tem, fica colada; quando domina, fica holográfica.
- **Marcar por número:** digite `3 7 12-15` e as figurinhas são marcadas de uma vez.
- **Lista do que falta:** vem pronta para colar no WhatsApp ou no Discord.
- **Link da coleção:** quem abre vê a sua coleção e pode **comparar** com a dele ("ele tem e você não"), sem conta nenhuma.
- **Imagem da página do álbum** em PNG, para compartilhar.
- **Backup/restauração** por código, para passar a coleção para outro aparelho.
- **Todas as temporadas:** C7 T4 (atual) e C7 T3 (encerrada).
- **Ficha de cada sprite:** habilidade, valores por nível, onde encontrar, bônus de cada variante, custo de Pó e chance de drop.
- **22 idiomas:** detectados pelo navegador, com árabe da direita para a esquerda.
- **Instala como app no celular e no computador** (PWA). O botão "Instalar app" instala direto no Android e no Chrome/Edge; no iPhone, mostra o passo a passo do Safari. Com rede cortada, abre offline.
- **Sugestões de melhoria:** o usuário escolhe o tipo (ideia, erro, tradução, dado errado), escreve e envia.

**No ar:** https://matheusraull99.github.io/lockerdex/. Cada push na `main` publica sozinho pelo GitHub Actions (`.github/workflows/deploy.yml`), e todo dia às 06:15 UTC o workflow recria o catálogo de cosméticos antes de publicar.

## Páginas

| Rota | O que tem | Dados |
|---|---|---|
| `/` | Álbum dos Sprites (T4 e T3) | `src/data/seasons.json` |
| `/shop/` | Loja do dia, com preço e aviso de lista de desejos | fortnite-api `/v2/shop` (ao vivo) |
| `/cosmetics/` | 16 mil cosméticos com busca, filtros e histórico na loja | `public/data/cosmetics` (gerado) + API por item |
| `/lists/` | Lista de desejos e Meu armário, compartilháveis por link | no aparelho |
| `/leaks/` | Itens novos nos arquivos do jogo | `/v2/cosmetics/new` |
| `/jam-tracks/` | 729 Jam Tracks, com o que está na loja | `/v2/cosmetics/tracks` |
| `/map/` | Mapa atual com zoom e locais nomeados | `/v1/map` |
| `/news/` | Notícias do jogo | `/v2/news/br` |
| `/season/` | Contagem regressiva da temporada | `src/lib/ui.tsx` (`SEASON_END`) |

Cada rota tem endereço próprio em `/lockerdex/<rota>/` e uma versão por idioma em `/lockerdex/<idioma>/<rota>/`, por exemplo `/lockerdex/pt-BR/shop/`. O prefixo escolhe o idioma e segue nos links. Os links antigos com `#/rota` são convertidos ao abrir. A tabela de rotas fica em `src/lib/routes.json`.

Tudo que vem da fortnite-api usa o idioma do app. Quando a API não tem o idioma, cai no inglês.

## Rodar

```bash
npm install
npm run dev
```

Build de produção (pasta `dist/`, funciona em qualquer hospedagem estática):

```bash
npm run build
```

## Dados

- `data/raw/`: o que foi coletado do fortnite.gg em 25/09/2026.
- `data/build_data.py`: gera `src/data/seasons.json` (ids, raridade, custos, valores por nível). Rodar com `npm run data`.
- `data/fetch_icons.py`: copia os ícones para `public/icons`. Depois disso, use `VITE_IMG_BASE=local`. Sem isso, as imagens vêm do fortnite.gg.
- Os custos de Pó da T4 são **estimativas da comunidade**: o fortnite.gg ainda deixa zerado.
- `data/build_cosmetics.py` gera o catálogo enxuto de cosméticos: o índice mais os nomes nos 18 idiomas da API, cerca de 300 KB por idioma em vez de 23 MB. Rode de novo para atualizar o histórico da loja.

O código da coleção guarda 2 bits por figurinha, indexados pelo id do fortnite.gg. Por isso um link antigo continua valendo quando entram sprites novos.

## Google (SEO)

O build (`seoPages` no `vite.config.ts`) gera uma página pronta por rota e por idioma. São 230 páginas, cada uma com título, descrição, link canônico, as 22 versões de idioma (hreflang), prévia de link (Open Graph, com `public/og.png`) e um texto com links dentro do `#root`. O build também gera `sitemap.xml`, `robots.txt` e `404.html`.

Para cadastrar no **Google Search Console**:

1. Entre em https://search.google.com/search-console com a conta Google pessoal.
2. Clique em **Adicionar propriedade**, escolha **Prefixo do URL** e digite `https://matheusraull99.github.io/lockerdex/`.
3. Em **Tag HTML**, copie só o valor de `content="…"`.
4. Coloque esse valor no `.env` como `VITE_GSC_VERIFICATION=<valor>` e publique (push na `main`).
5. Volte ao Search Console e clique em **Verificar**.
6. Em **Sitemaps**, envie `sitemap.xml`.

O `robots.txt` só vale na raiz de um domínio. No GitHub Pages ele fica pronto para quando o site ganhar domínio próprio; nesse caso, publique com `BASE_PATH=/` e `SITE_ORIGIN=https://<domínio>`.

## Sugestões

O destino é o **Google Forms**: grátis, sem limite de respostas, e as sugestões caem numa planilha.

1. Crie um formulário com 4 perguntas de resposta curta ou parágrafo, nesta ordem: **Tipo · Sugestão · Contato · Informações técnicas**.
2. Copie o link público (em "Enviar", o que termina em `/viewform`).
3. Rode:

```bash
python data/gform_setup.py "<link do formulário>"
```

O script descobre os campos, grava `VITE_FEEDBACK_GFORM` e `VITE_FEEDBACK_GFORM_FIELDS` no `.env` e tira o e-mail de lá.

Outras opções, com prioridade menor: `VITE_FEEDBACK_URL` (POST JSON, como no Formspree) e `VITE_FEEDBACK_EMAIL` (mailto). Com tudo vazio, o botão some.

## App (PWA)

- `public/manifest.webmanifest` traz os ícones de 192/512, o maskable e as capturas de tela da janela de instalação.
- `public/apple-touch-icon.png` é o ícone do iPhone.
- `public/sw.js` guarda o app para uso offline. No build, o `vite.config.ts` preenche a lista de arquivos e a versão do cache.
- **Instalar no celular exige o site publicado em HTTPS.** O `localhost` só serve para testar no próprio PC.

## Idiomas

`src/i18n/locales/<código>.json`, um arquivo por idioma e todos com as mesmas chaves do `en.json`. Para somar um idioma:

1. Crie o arquivo.
2. Adicione uma linha em `LANGS` (`src/lib/langs.ts`).

Chave que faltar cai no inglês.

Fã-site sem vínculo com a Epic Games. Fortnite é marca registrada da Epic Games.
