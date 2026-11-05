/*
 * Novidades do Lockerdex (quadro na página inicial). A mais nova primeiro.
 * Em português (pt-BR e pt-PT) e inglês; os outros idiomas mostram o inglês.
 * Para acrescentar: uma linha no começo da lista, com a data (AAAA-MM-DD) e o texto curto, do jeito que a pessoa vê.
 */
export interface AppNewsItem {
  date: string;
  pt: [string, string]; // título, descrição
  en: [string, string];
}

export const APP_NEWS: AppNewsItem[] = [
  {
    date: "2026-11-05",
    pt: ["Compartilhar com 5 modelos", "Cartão, Vitrine, Me ajuda a fechar, Página de álbum e Duelo, com prévia antes de baixar. E o link da coleção para mandar a um amigo e fazer o Duelo."],
    en: ["Share with 5 templates", "Collector card, Showcase, Help me finish, Album page and Duel, with a preview before downloading. Plus your collection link to send a friend for the Duel."],
  },
  {
    date: "2026-11-02",
    pt: ["Nomes do jogo em português", "Os elementais da minitemporada com os nomes de dentro do jogo (Moedonho, Apatilda…) e as variantes Valioso e Maldito, com o bônus de cada uma."],
    en: ["Mini season names and bonuses", "The mini season Sprites with their in-game names, plus the Fortune and Cursed variants with what each one does."],
  },
  {
    date: "2026-11-01",
    pt: ["Minitemporada Caçadores de Tesouro", "13 elementais novos no álbum (C7 Mini), contagem até 5/12 e os Dias do Capitão, quando chegam elementais novos."],
    en: ["Treasure Hunters mini season", "13 new Sprites in the album (C7 Mini), a countdown to Dec 5 and the Captain's Days, when new Sprites arrive."],
  },
  {
    date: "2026-10-16",
    pt: ["Cara nova no celular", "Figurinhas grandes por raridade, festa ao completar um elemental, capa com o seu álbum e as fichas de Hoje no Fortnite, e ícone novo do app."],
    en: ["New look on phones", "Big stickers by rarity, a celebration when you complete a Sprite, a home with your album and today's Fortnite events, and a new app icon."],
  },
  {
    date: "2026-10-16",
    pt: ["Elementais novos entram sozinhos", "Quando sai elemental ou variante nova, o álbum é atualizado e traduzido em 22 idiomas automaticamente."],
    en: ["New Sprites arrive on their own", "When a new Sprite or variant comes out, the album updates and gets translated into 22 languages automatically."],
  },
  {
    date: "2026-10-15",
    pt: ["Mel, Salgueiro do Desejo e Quack", "Os elementais da atualização 42.40 e as 5 variantes Quack da Temporada 4."],
    en: ["Honey, One Wish Willow and Quack", "The Sprites from update 42.40 and the 5 Quack variants of Season 4."],
  },
];
