# ARTVISION — Landing page

Landing page one-page cinematográfica do estúdio **ArtVision**. Site 100% estático
(HTML + CSS + JS vanilla, GSAP/ScrollTrigger + Lenis via CDN), pronto para o GitHub Pages.

## Como publicar no GitHub Pages

1. No repositório: **Settings → Pages**
2. Em *Source*, escolha **Deploy from a branch**, selecione a branch e a pasta **/ (root)**
3. Salve — o site fica no ar em `https://SEU-USUARIO.github.io/artvision/`

## Onde editar cada coisa

| O que | Onde |
|---|---|
| Textos (headline, painéis, comparativo, créditos) | `index.html` — procure pelos comentários `EDITE AQUI` |
| Itens do portfólio (título, cliente, tag, duração) | `js/portfolio.json` |
| Número do WhatsApp e e-mail | `index.html` — seção `[5] CRÉDITOS FINAIS` |
| Cores, fontes e espaçamentos | `css/style.css` — bloco `:root` no topo |

## Como trocar os vídeos

- **Fundos 16:9** → solte os arquivos em `videos/bg/` como `01.mp4` … `06.mp4`
  - `01` = hero (desktop, controlado pelo scroll) · `02-04` = painéis "Como funciona" · `05` = créditos finais
  - `01-mobile.mp4` = hero no celular (9:16, também controlado pelo scroll)
- **Portfólio 9:16** → solte em `videos/vertical/` como `01.mp4` … `08.mp4`
- **Posters** (imagem de capa, opcional) → `videos/posters/` (`bg-01.jpg`, `v-01.jpg` …)

Enquanto um mp4 não existir, o site mostra automaticamente um gradiente animado
no lugar — nada quebra.

> Dica: exporte os mp4 em **H.264 (yuv420p)** com `-movflags +faststart` para
> tocarem em todos os navegadores e começarem rápido.

## Comportamentos de performance

- Vídeos com lazy load, `preload="metadata"`, sempre `muted` no autoplay
- Vídeo só toca quando está visível (IntersectionObserver)
- Mobile (<768px): sem cursor custom, sem noise, sem pin horizontal —
  o portfólio vira 2 carrosséis horizontais com snap (o próximo card fica
  "espiando" na direita). Os vídeos do portfólio tocam normalmente (mudos,
  só quando visíveis); dos FUNDOS, apenas o hero tem vídeo no celular
  (o 9:16 leve) — os demais fundos ficam no poster/gradiente
- `prefers-reduced-motion`: sem preloader, sem parallax, vídeos pausados
