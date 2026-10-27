/* ==========================================================================
   ARTVISION — main.js
   --------------------------------------------------------------------------
   Sumário:
   01. Guardas e detecção de ambiente
   02. Lenis (smooth scroll) + integração com ScrollTrigger
   03. Preloader (íris de diafragma)
   04. HUD (timecode 24fps, shutter, label de seção, REC→CUT)
   05. Cursor customizado (anel de foco)
   06. Vídeos de fundo (lazy + fallback em gradiente)
   07. Portfólio (fetch do JSON, cards, play/pause por visibilidade)
   08. O Rolo — scroll horizontal pinado (desktop)
   09. Como funciona — iris wipe entre painéis
   10. Comparativo — reveal com stagger
   11. Créditos finais — rolagem de créditos + congelamento
   12. Lightbox com iris wipe
   ========================================================================== */

(function () {
  "use strict";

  /* === 01. GUARDAS E DETECÇÃO ============================================ */

  var REDUZIR = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MOBILE = window.matchMedia("(max-width: 768px)").matches;
  var TOUCH = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  // Se o GSAP não carregou (CDN fora do ar), mostra tudo sem animação e sai.
  if (!window.gsap || !window.ScrollTrigger) {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    var pre = document.getElementById("preloader");
    if (pre) pre.remove();
    ligarLightboxUI();     // o lightbox funciona mesmo sem GSAP (sem iris wipe)
    construirPortfolio();  // o portfólio também
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* === 02. LENIS + SCROLLTRIGGER ========================================= */

  var lenis = null;
  var velocidadeScroll = 0; // usada pelo HUD "SHUTTER"

  // Lenis só no desktop: no layout mobile (carrosséis com scroll próprio)
  // ele interceptaria o wheel/trackpad e impediria o scroll horizontal
  if (!REDUZIR && !MOBILE && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });

    // Lenis avisa o ScrollTrigger a cada frame de scroll
    lenis.on("scroll", function (e) {
      velocidadeScroll = e.velocity || 0;
      ScrollTrigger.update();
    });

    // O ticker do GSAP vira o "motor" do Lenis (recomendação oficial,
    // equivale ao scrollerProxy para o caso de scroll nativo suavizado)
    gsap.ticker.add(function (t) {
      lenis.raf(t * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  /* === 03. PRELOADER ===================================================== */

  var preloader = document.getElementById("preloader");

  function abrirIris(aoTerminar) {
    if (!preloader || REDUZIR) {
      if (preloader) preloader.remove();
      aoTerminar();
      return;
    }

    var fstop = document.getElementById("preloader-fstop");
    var valores = ["f/16", "f/8", "f/4", "f/2", "f/1.4"]; // contagem de abertura
    var tl = gsap.timeline({
      onComplete: function () {
        preloader.remove();
        aoTerminar();
      }
    });

    // Contagem dos f-stops (1.2s no total)
    valores.forEach(function (v, i) {
      tl.call(function () { fstop.textContent = v; }, null, i * 0.24);
    });

    // As lâminas deslizam para fora no próprio eixo (o <g> pai já está
    // rotacionado), abrindo a íris. Total < 2.5s.
    tl.to(".iris-blade", {
      x: 230,
      duration: 0.9,
      ease: "power3.inOut",
      stagger: 0.03
    }, 1.2);
    tl.to("#preloader-fstop, .preloader-label", { opacity: 0, duration: 0.3 }, 1.25);
    tl.to(preloader, { opacity: 0, duration: 0.35 }, "-=0.25");
  }

  /* === 04. HUD =========================================================== */

  // Timecode real a 24fps (HH:MM:SS:FF)
  (function iniciarTimecode() {
    var el = document.getElementById("hud-timecode");
    if (!el) return;
    var inicio = performance.now();
    function dois(n) { return String(n).padStart(2, "0"); }
    function tick(agora) {
      var s = (agora - inicio) / 1000;
      var frames = Math.floor(s * 24);
      var ff = frames % 24;
      var ss = Math.floor(s) % 60;
      var mm = Math.floor(s / 60) % 60;
      var hh = Math.floor(s / 3600) % 24;
      el.textContent = dois(hh) + ":" + dois(mm) + ":" + dois(ss) + ":" + dois(ff);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  // SHUTTER: velocidade do scroll (0.00–9.99), com decaimento suave
  (function iniciarShutter() {
    var el = document.getElementById("hud-shutter");
    if (!el) return;
    var exibido = 0;
    var ultimoY = window.scrollY;
    gsap.ticker.add(function () {
      var alvo;
      if (lenis) {
        alvo = Math.min(Math.abs(velocidadeScroll) / 8, 9.99);
      } else {
        // fallback sem Lenis: delta do scroll nativo
        var y = window.scrollY;
        alvo = Math.min(Math.abs(y - ultimoY) / 14, 9.99);
        ultimoY = y;
      }
      exibido += (alvo - exibido) * 0.12;
      el.textContent = exibido.toFixed(2);
    });
  })();

  // Nome da seção atual no canto inferior esquerdo
  function ligarLabelsDeSecao() {
    var label = document.getElementById("hud-section");
    document.querySelectorAll("[data-hud]").forEach(function (sec) {
      ScrollTrigger.create({
        trigger: sec,
        start: "top 55%",
        end: "bottom 55%",
        onEnter: function () { label.textContent = sec.dataset.hud; },
        onEnterBack: function () { label.textContent = sec.dataset.hud; }
      });
    });

    // REC vira CUT. quando os créditos entram
    ScrollTrigger.create({
      trigger: "#creditos",
      start: "top 60%",
      onEnter: function () {
        document.body.classList.add("modo-cut");
        document.getElementById("rec-label").textContent = "CUT.";
      },
      onLeaveBack: function () {
        document.body.classList.remove("modo-cut");
        document.getElementById("rec-label").textContent = "REC";
      }
    });
  }

  /* === 05. CURSOR CUSTOMIZADO ============================================ */

  (function iniciarCursor() {
    if (TOUCH || REDUZIR) return; // desativado em touch
    var cursor = document.getElementById("cursor");
    var labelEl = document.getElementById("cursor-label");
    if (!cursor) return;

    document.body.classList.add("tem-cursor");

    var alvoX = innerWidth / 2, alvoY = innerHeight / 2;
    var x = alvoX, y = alvoY;

    window.addEventListener("mousemove", function (e) {
      alvoX = e.clientX;
      alvoY = e.clientY;
    }, { passive: true });

    // Segue o mouse com lerp (atraso suave, como foco puxado à mão)
    gsap.ticker.add(function () {
      x += (alvoX - x) * 0.18;
      y += (alvoY - y) * 0.18;
      cursor.style.transform = "translate(" + x + "px," + y + "px)";
    });

    // Sobre itens clicáveis: expande e mostra PLAY/FOCAR
    document.addEventListener("mouseover", function (e) {
      var alvo = e.target.closest("[data-cursor], .filmcard, a, button");
      if (alvo) {
        cursor.classList.add("ativo");
        labelEl.textContent =
          alvo.dataset.cursor || (alvo.classList.contains("filmcard") ? "PLAY" : "FOCAR");
      } else {
        cursor.classList.remove("ativo");
      }
    }, { passive: true });
  })();

  /* === 05b. HERO SCRUB — o vídeo avança/volta com o scroll =============== */

  // O hero fica pinado por um trecho de scroll e o currentTime do vídeo
  // acompanha o progresso: descer a página roda o vídeo, subir rebobina.
  // Vale para desktop (vídeo 16:9) e celular (vídeo 9:16).
  // AJUSTE AQUI a "duração" do efeito mudando o end (+=160% = 1.6 telas).
  function ligarHeroScrub() {
    var vHero = document.querySelector(".sec-hero .bgvideo");
    if (!vHero || REDUZIR) return;

    // Escolhe a fonte: 9:16 no celular (se existir), 16:9 no desktop
    var usarMobile = MOBILE && vHero.dataset.srcMobile;
    if (usarMobile && vHero.dataset.posterMobile) vHero.poster = vHero.dataset.posterMobile;

    // Carrega o vídeo já (sem autoplay — quem dá play é o scroll)
    vHero.dataset.scrub = "1"; // avisa ligarVideosDeFundo para ignorar este
    vHero.removeAttribute("loop");
    vHero.preload = "auto";
    vHero.src = usarMobile ? vHero.dataset.srcMobile : vHero.dataset.src;
    vHero.pause();
    // Visível desde já: o poster cobre o carregamento (e o caso de o
    // celular bloquear vídeo, ex. Modo de Baixo Consumo)
    vHero.classList.add("carregado");
    vHero.addEventListener("error", function () { vHero.remove(); }, { once: true });

    // iOS só desenha frames de um vídeo pausado depois de um play();
    // um play+pause mudo logo após os metadados "destrava" o decoder
    vHero.addEventListener("loadedmetadata", function () {
      var p = vHero.play();
      if (p && p.then) p.then(function () { vHero.pause(); }).catch(function () {});
      else vHero.pause();
    }, { once: true });

    var tempoAlvo = 0;

    ScrollTrigger.create({
      trigger: ".sec-hero",
      start: "top top",
      end: MOBILE ? "+=130%" : "+=160%", // trecho menor no celular
      pin: true,
      anticipatePin: 1,
      scrub: true,
      onUpdate: function (st) {
        if (vHero.duration) {
          // -0.05s para nunca bater no fim exato (evita tela de "vídeo acabou")
          tempoAlvo = st.progress * (vHero.duration - 0.05);
        }
      }
    });

    // Aproxima o currentTime do alvo com lerp: o seek fica suave mesmo
    // com scroll rápido, e só busca quando a diferença compensa
    gsap.ticker.add(function () {
      if (!vHero.isConnected || !vHero.duration || vHero.seeking) return;
      var delta = tempoAlvo - vHero.currentTime;
      if (Math.abs(delta) > 0.02) vHero.currentTime += delta * 0.22;
    });
  }

  /* === 06. VÍDEOS DE FUNDO =============================================== */

  // Desktop: todos os fundos carregam sob demanda perto da viewport.
  // Mobile: só o HERO ganha vídeo (a versão 9:16, leve) — os demais fundos
  // ficam com poster/gradiente para economizar dados e bateria.
  function ligarVideosDeFundo() {
    var videos = document.querySelectorAll(".bgvideo[data-src]");
    if (REDUZIR) return; // reduced-motion: tudo parado com poster

    if (MOBILE) {
      // O hero é tratado em ligarHeroScrub (scrub pelo scroll, fonte 9:16);
      // os demais fundos ficam no poster/gradiente para economizar dados
      return;
    }

    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (ent) {
        var v = ent.target;
        if (v.dataset.scrub) return; // o vídeo do hero é controlado pelo scroll
        if (ent.isIntersecting) {
          if (!v.src) {
            v.src = v.dataset.src;
            v.addEventListener("canplay", function () { v.classList.add("carregado"); }, { once: true });
            // mp4 ainda não existe? fica só o gradiente de fallback
            v.addEventListener("error", function () { v.remove(); }, { once: true });
          }
          v.play().catch(function () {});
        } else if (v.src) {
          v.pause();
        }
      });
    }, { rootMargin: "25% 0px" });

    videos.forEach(function (v) { io.observe(v); });
  }

  /* === 07. PORTFÓLIO ===================================================== */

  // Fallback caso o fetch falhe (ex.: abrir o index.html direto do disco)
  var DADOS_FALLBACK = [
    { arquivo: "videos/vertical/01.mp4", poster: "videos/posters/v-01.jpg", titulo: "RETRATO EM MOVIMENTO", cliente: "CLIENTE 01", tag: "COMERCIAL", duracao: "00:12" },
    { arquivo: "videos/vertical/02.mp4", poster: "videos/posters/v-02.jpg", titulo: "LUZ E TEXTURA", cliente: "CLIENTE 02", tag: "BRANDED CONTENT", duracao: "00:26" },
    { arquivo: "videos/vertical/03.mp4", poster: "videos/posters/v-03.jpg", titulo: "GERAÇÃO 02", cliente: "CLIENTE 03", tag: "SOCIAL", duracao: "00:10" },
    { arquivo: "videos/vertical/04.mp4", poster: "videos/posters/v-04.jpg", titulo: "CENA NOTURNA", cliente: "CLIENTE 04", tag: "FASHION FILM", duracao: "00:11" },
    { arquivo: "videos/vertical/05.mp4", poster: "", titulo: "PROJETO 05", cliente: "EM BREVE", tag: "COMERCIAL", duracao: "00:15" },
    { arquivo: "videos/vertical/06.mp4", poster: "", titulo: "PROJETO 06", cliente: "EM BREVE", tag: "PRODUTO", duracao: "00:20" },
    { arquivo: "videos/vertical/07.mp4", poster: "", titulo: "PROJETO 07", cliente: "EM BREVE", tag: "MÚSICA", duracao: "00:30" },
    { arquivo: "videos/vertical/08.mp4", poster: "", titulo: "PROJETO 08", cliente: "EM BREVE", tag: "COMERCIAL", duracao: "00:18" }
  ];

  var itensPortfolio = [];

  function construirPortfolio() {
    var strip = document.getElementById("filmstrip");
    if (!strip || strip.childElementCount > 0) return Promise.resolve();

    return fetch("js/portfolio.json")
      .then(function (r) { return r.json(); })
      .then(function (json) { return json.itens || DADOS_FALLBACK; })
      .catch(function () { return DADOS_FALLBACK; })
      .then(function (itens) {
        itensPortfolio = itens;
        itens.forEach(function (item, i) {
          var slide = document.createElement("div");
          slide.className = "filmcard-slide";

          var card = document.createElement("article");
          card.className = "filmcard";
          card.tabIndex = 0;
          card.setAttribute("role", "button");
          card.setAttribute("aria-label", "Assistir: " + item.titulo + " — " + item.cliente);
          card.dataset.indice = i;

          // Placeholder (fica embaixo; o vídeo cobre quando existe)
          var ph = document.createElement("div");
          ph.className = "card-placeholder";
          ph.textContent = "EM BREVE";
          card.appendChild(ph);

          // Vídeo do card: muted + loop + playsinline, preload só de metadata
          var v = document.createElement("video");
          v.muted = true;
          v.loop = true;
          v.playsInline = true;
          v.preload = "metadata";
          if (item.poster) v.poster = item.poster;
          v.src = item.arquivo;
          v.addEventListener("error", function () {
            v.remove();           // mp4 não existe ainda → fica o placeholder
            item.semVideo = true;
          }, { once: true });
          card.appendChild(v);

          // Cliente (acima), título + timecode fake (abaixo)
          var cli = document.createElement("span");
          cli.className = "card-cliente";
          cli.textContent = item.cliente + " · " + item.tag;
          card.appendChild(cli);

          var rodape = document.createElement("div");
          rodape.className = "card-rodape";
          rodape.innerHTML =
            '<span class="card-titulo">' + item.titulo + "</span>" +
            '<span class="card-tc">TC 00:00:' + String(i + 1).padStart(2, "0") + ":00 · " + item.duracao + "</span>";
          card.appendChild(rodape);

          // Clique / Enter abre o lightbox
          card.addEventListener("click", function (e) { abrirLightbox(i, e); });
          card.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirLightbox(i, e); }
          });

          slide.appendChild(card);
          strip.appendChild(slide);
        });

        montarCarrosseisMobile();
        ligarAutoplayDosCards();
      });
  }

  // No mobile, divide os 8 slides em 2 carrosséis horizontais (4 + 4),
  // cada um com scroll e snap próprios — o CSS dá o "peek" do próximo card
  function montarCarrosseisMobile() {
    if (!MOBILE) return;
    var strip = document.getElementById("filmstrip");
    var slides = Array.prototype.slice.call(strip.querySelectorAll(".filmcard-slide"));
    if (!slides.length) return;

    var linha1 = document.createElement("div");
    var linha2 = document.createElement("div");
    linha1.className = linha2.className = "carrossel";

    var metade = Math.ceil(slides.length / 2);
    slides.forEach(function (slide, i) {
      (i < metade ? linha1 : linha2).appendChild(slide);
    });
    strip.appendChild(linha1);
    if (linha2.childElementCount) strip.appendChild(linha2); // evita faixa vazia
  }

  // Vídeo visível → play; fora da viewport → pause (economia de CPU/bateria)
  function ligarAutoplayDosCards() {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (ent) {
        var v = ent.target.querySelector("video");
        if (!v) return;
        if (ent.isIntersecting && !REDUZIR && !lightboxAberto) {
          v.play().catch(function () {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.35 });

    document.querySelectorAll(".filmcard").forEach(function (c) { io.observe(c); });
  }

  /* === 08. O ROLO — SCROLL HORIZONTAL (desktop) ========================== */

  function ligarRoloHorizontal() {
    var strip = document.getElementById("filmstrip");
    var playhead = document.getElementById("ruler-playhead");

    if (MOBILE || REDUZIR) {
      // Mobile: 2 carrosséis horizontais (ver montarCarrosseisMobile + CSS);
      // reduced-motion: o filmstrip fica com scroll manual (CSS)
      return;
    }

    // O scroll vertical vira translateX do filmstrip, com a seção pinada
    var distancia = function () {
      return Math.max(strip.scrollWidth - innerWidth + 2 * 64, 0);
    };

    gsap.to(strip, {
      x: function () { return -distancia(); },
      ease: "none",
      scrollTrigger: {
        trigger: ".sec-rolo",
        pin: ".rolo-pin",
        pinSpacing: true,
        scrub: 1,
        start: "top top",
        end: function () { return "+=" + (distancia() + innerHeight * 0.4); },
        invalidateOnRefresh: true,
        onUpdate: function (st) {
          // Playhead da régua acompanha o progresso da seção
          if (playhead) playhead.style.left = (st.progress * 100).toFixed(2) + "%";
        }
      }
    });
  }

  /* === 09. COMO FUNCIONA — IRIS WIPE ENTRE PAINÉIS ======================= */

  function ligarProcesso() {
    if (REDUZIR) return; // CSS já empilha os painéis sem clip-path

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".sec-processo",
        pin: ".processo-pin",
        scrub: 0.8,
        start: "top top",
        end: "+=220%"
      }
    });

    // Estrutura: [lê painel 1] [wipe 2] [lê painel 2] [wipe 3] [lê painel 3]
    // O texto do painel anterior SOME no início de cada wipe — assim nunca
    // ficam dois textos sobrepostos no meio da transição.
    tl.to({}, { duration: 0.55 }); // tempo de leitura do painel 1

    tl.addLabel("w1");
    tl.to(".painel-1 .painel-conteudo",
      { opacity: 0, y: -36, duration: 0.25, ease: "power1.in" }, "w1");
    tl.fromTo(".painel-2",
      { clipPath: "circle(0% at 50% 50%)" },
      { clipPath: "circle(142% at 50% 50%)", ease: "power1.inOut", duration: 0.7 }, "w1");
    tl.fromTo(".painel-2 .painel-conteudo",
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1, duration: 0.45, ease: "power2.out" }, "w1+=0.2");

    tl.to({}, { duration: 0.55 }); // tempo de leitura do painel 2

    tl.addLabel("w2");
    tl.to(".painel-2 .painel-conteudo",
      { opacity: 0, y: -36, duration: 0.25, ease: "power1.in" }, "w2");
    tl.fromTo(".painel-3",
      { clipPath: "circle(0% at 50% 50%)" },
      { clipPath: "circle(142% at 50% 50%)", ease: "power1.inOut", duration: 0.7 }, "w2");
    tl.fromTo(".painel-3 .painel-conteudo",
      { opacity: 0, scale: 0.92 },
      { opacity: 1, scale: 1, duration: 0.45, ease: "power2.out" }, "w2+=0.2");

    tl.to({}, { duration: 0.45 }); // tempo de leitura do painel 3
  }

  /* === 10. COMPARATIVO — STAGGER ========================================= */

  function ligarComparativo() {
    if (REDUZIR) return;
    gsap.from(".slate-row", {
      opacity: 0,
      y: 26,
      duration: 0.7,
      ease: "power2.out",
      stagger: 0.1,
      scrollTrigger: { trigger: ".slate-table", start: "top 80%" }
    });
    gsap.from(".slate", {
      rotateX: 8,
      transformPerspective: 900,
      opacity: 0,
      duration: 0.9,
      ease: "power2.out",
      scrollTrigger: { trigger: ".sec-comparativo", start: "top 70%" }
    });
  }

  /* === 11. CRÉDITOS FINAIS =============================================== */

  function ligarCreditos() {
    if (REDUZIR) return; // CSS: rolagem escondida, bloco final visível

    var roll = document.getElementById("creditos-roll");

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".sec-creditos",
        pin: ".creditos-pin",
        scrub: 1,
        start: "top top",
        end: "+=260%"
      }
    });

    // Créditos sobem lentamente através da tela...
    tl.to(roll, {
      y: function () { return -(roll.scrollHeight + innerHeight); },
      ease: "none",
      duration: 3
    });
    // ...desaparecem no trecho final (para não sobrepor o bloco seguinte)...
    tl.to(roll, { opacity: 0, duration: 0.3 }, "-=0.45");
    // ...e só então o "SUA MARCA AQUI — ESTRELANDO" entra congelado
    tl.to(".creditos-final", {
      opacity: 1,
      y: 0,
      ease: "power2.out",
      duration: 0.8
    }, "-=0.1");
  }

  /* === 12. LIGHTBOX COM IRIS WIPE ======================================== */

  var lightbox, lbVideo, lbPlaceholder;
  var lightboxAberto = false;
  var indiceAtual = 0;
  var origemIris = "50% 50%"; // ponto de onde a íris abre (posição do clique)

  // Sem GSAP (CDN fora do ar) ou com reduced-motion, abre/fecha sem iris wipe
  function semAnimacaoLB() { return REDUZIR || !window.gsap; }

  // Busca os elementos e liga os botões/teclas do lightbox
  function ligarLightboxUI() {
    lightbox = document.getElementById("lightbox");
    lbVideo = document.getElementById("lightbox-video");
    lbPlaceholder = document.getElementById("lightbox-placeholder");

    document.getElementById("lb-fechar").addEventListener("click", fecharLightbox);
    document.getElementById("lightbox-backdrop").addEventListener("click", fecharLightbox);
    document.getElementById("lb-prev").addEventListener("click", function () { navegarLightbox(-1); });
    document.getElementById("lb-next").addEventListener("click", function () { navegarLightbox(1); });
    document.addEventListener("keydown", function (e) {
      if (!lightboxAberto) return;
      if (e.key === "Escape") fecharLightbox();
      if (e.key === "ArrowLeft") navegarLightbox(-1);
      if (e.key === "ArrowRight") navegarLightbox(1);
    });
  }

  function preencherLightbox(i) {
    var item = itensPortfolio[i];
    if (!item) return;
    indiceAtual = i;

    document.getElementById("lb-cliente").textContent = item.cliente;
    document.getElementById("lb-titulo").textContent = item.titulo;
    document.getElementById("lb-meta").textContent = item.tag + " · " + item.duracao;

    if (item.semVideo) {
      lbVideo.removeAttribute("src");
      lbVideo.load();
      lbVideo.style.visibility = "hidden";
      lbPlaceholder.hidden = false;
    } else {
      lbPlaceholder.hidden = true;
      lbVideo.style.visibility = "visible";
      lbVideo.src = item.arquivo;
      if (item.poster) lbVideo.poster = item.poster;
      // Som permitido: o play aconteceu por gesto do usuário
      lbVideo.play().catch(function () {});
    }
  }

  function abrirLightbox(i, evento) {
    lightboxAberto = true;
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    if (lenis) lenis.stop();

    // Pausa os vídeos do filmstrip enquanto o lightbox está aberto
    document.querySelectorAll(".filmcard video").forEach(function (v) { v.pause(); });

    // Íris abre a partir do ponto clicado
    if (evento && evento.clientX) {
      origemIris = evento.clientX + "px " + evento.clientY + "px";
    }
    preencherLightbox(i);

    if (semAnimacaoLB()) {
      lightbox.style.clipPath = "none";
    } else {
      gsap.fromTo(lightbox,
        { clipPath: "circle(0% at " + origemIris + ")" },
        { clipPath: "circle(142% at " + origemIris + ")", duration: 0.65, ease: "power3.inOut" });
    }
  }

  function fecharLightbox() {
    if (!lightboxAberto) return;
    lightboxAberto = false;
    lbVideo.pause();

    var depois = function () {
      lightbox.hidden = true;
      lbVideo.removeAttribute("src");
      lbVideo.load();
      document.body.style.overflow = "";
      if (lenis) lenis.start();
      // Retoma os vídeos visíveis do filmstrip
      document.querySelectorAll(".filmcard video").forEach(function (v) {
        var r = v.getBoundingClientRect();
        if (r.left < innerWidth && r.right > 0 && r.top < innerHeight && r.bottom > 0) {
          v.play().catch(function () {});
        }
      });
    };

    if (semAnimacaoLB()) { depois(); return; }
    gsap.to(lightbox, {
      clipPath: "circle(0% at " + origemIris + ")",
      duration: 0.5,
      ease: "power3.inOut",
      onComplete: depois
    });
  }

  function navegarLightbox(delta) {
    var n = itensPortfolio.length;
    preencherLightbox((indiceAtual + delta + n) % n);
  }

  /* === ENTRADA DO HERO ==================================================== */

  function animarEntradaHero() {
    if (REDUZIR) return;
    gsap.to(".sec-hero .reveal", {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: "power3.out",
      stagger: 0.12,
      delay: 0.1
    });
  }

  // Elementos .reveal fora do hero aparecem ao entrar na viewport
  function ligarReveals() {
    document.querySelectorAll(".reveal").forEach(function (el) {
      if (el.closest(".sec-hero")) return;
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" }
      });
    });
  }

  /* === BOOT =============================================================== */

  ligarLightboxUI();

  construirPortfolio().then(function () {
    ligarHeroScrub();
    ligarVideosDeFundo();
    ligarRoloHorizontal();
    ligarProcesso();
    ligarComparativo();
    ligarCreditos();
    ligarLabelsDeSecao();
    ligarReveals();
    ScrollTrigger.refresh();
  });

  abrirIris(animarEntradaHero);

  // Recalcula as medidas quando tudo (fontes, posters) terminou de carregar
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });

  // O layout mobile/desktop é decidido no carregamento (pins, carrosséis,
  // vídeo do hero). Se a janela cruzar o breakpoint (girar o tablet,
  // redimensionar), recarrega para remontar tudo no layout certo.
  window.matchMedia("(max-width: 768px)").addEventListener("change", function () {
    location.reload();
  });

  // Âncoras internas respeitando o Lenis
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var alvo = document.querySelector(a.getAttribute("href"));
      if (!alvo) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(alvo, { offset: 0, duration: 1.6 });
      else alvo.scrollIntoView({ behavior: REDUZIR ? "auto" : "smooth" });
    });
  });
})();
