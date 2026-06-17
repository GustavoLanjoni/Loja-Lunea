const API_URL = "http://localhost:3000/produtos";
const API_FAVORITOS = "http://localhost:3000/favoritos";
const API_DESTAQUE = "http://localhost:3000/destaque";
const API_CATEGORIAS = "http://localhost:3000/categorias";
const API_DICAS = "http://localhost:3000/dicas";
const API_COLECOES = "http://localhost:3000/colecoes";

const LIMITE_PRODUTOS_SECAO = 8;

/* =========================================================
   ELEMENTOS PRINCIPAIS
========================================================= */

const productsGrid = document.getElementById("productsGrid");
const selectedProductsGrid = document.getElementById("selectedProductsGrid");

const cartDrawer = document.getElementById("cartDrawer");
const overlay = document.getElementById("overlay");

const abrirCarrinho =
  document.getElementById("openCart") ||
  document.getElementById("abrirCarrinho");

const fecharCarrinho = document.getElementById("fecharCarrinho");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const finalizarPedido = document.getElementById("finalizarPedido");
const toast = document.getElementById("toast");

const searchInput =
  document.getElementById("searchInput") ||
  document.getElementById("buscarProdutoLoja") ||
  document.querySelector(".search-box input");

/* MENU MOBILE */
const menuButton = document.getElementById("menuButton");
const mobileSideMenu = document.getElementById("mobileSideMenu");
const closeMobileMenu = document.getElementById("closeMobileMenu");
const menuOverlay = document.getElementById("menuOverlay");

/* BUSCA */
const searchMobileButton = document.getElementById("searchMobileButton");
const mobileSearchPanel = document.getElementById("mobileSearchPanel");
const mobileSearchInput = document.getElementById("mobileSearchInput");
const mobileSearchClose = document.getElementById("mobileSearchClose");
const mobileSearchSubmit = document.getElementById("mobileSearchSubmit");

let produtosLoja = [];
let favoritosIds = new Set();

let observerGeral = null;
let observerCardsProdutos = null;

/* =========================================================
   TOAST
========================================================= */

function mostrarToast(mensagem) {
  if (!toast) return;

  toast.textContent = mensagem;
  toast.classList.add("active");

  setTimeout(() => {
    toast.classList.remove("active");
  }, 2500);
}

/* =========================================================
   HELPERS
========================================================= */

function formatarPreco(valor) {
  return Number(valor || 0).toFixed(2).replace(".", ",");
}

function limitarTexto(texto, limite = 120) {
  if (!texto) return "";

  const textoLimpo = String(texto).trim();

  if (textoLimpo.length <= limite) {
    return textoLimpo;
  }

  return textoLimpo.substring(0, limite).trim() + "...";
}

function pegarImagemProduto(produto) {
  console.log("Produto completo:", produto);

  // Array imagens vindo do backend
  if (
    produto.imagens &&
    Array.isArray(produto.imagens) &&
    produto.imagens.length > 0 &&
    produto.imagens[0].imagem_url
  ) {
    return produto.imagens[0].imagem_url;
  }

  // Caso venha como produto_imagens
  if (
    produto.produto_imagens &&
    produto.produto_imagens.length > 0
  ) {
    return produto.produto_imagens[0].imagem_url;
  }

  // Campo único
  if (produto.imagem_url) {
    return produto.imagem_url;
  }

  return "/assets/img/sem-imagem.png";
}

/* =========================================================
   ANIMAÇÕES AO ROLAR A PÁGINA - LUNEA
========================================================= */

function prepararAnimacoesScroll() {
  const elementosAnimados = [
    ".hero-copy",
    ".hero-showcase",
    ".brand-strip",
    ".collection-intro",
    ".products-grid",
    ".lunea-video-container",
    ".lunea-faq-container",
    ".home-highlight",
    ".home-categories",
    ".skin-tips-section",
    ".brand-story",
    ".premium-strip",
    ".contact-section",
    ".footer",
    ".footer-extra",
  ];

  elementosAnimados.forEach((seletor) => {
    document.querySelectorAll(seletor).forEach((elemento, index) => {
      elemento.classList.add("scroll-reveal");

      if (index % 2 === 0) {
        elemento.classList.add("reveal-delay-1");
      }
    });
  });

  if (observerGeral) {
    observerGeral.disconnect();
  }

  observerGeral = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("reveal-active");
        } else {
          entrada.target.classList.remove("reveal-active");
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  document.querySelectorAll(".scroll-reveal").forEach((elemento) => {
    observerGeral.observe(elemento);
  });
}

function animarCardsProdutos() {
  const cards = document.querySelectorAll(".product-card");

  if (observerCardsProdutos) {
    observerCardsProdutos.disconnect();
  }

  cards.forEach((card, index) => {
    card.classList.add("scroll-reveal-zoom");

    card.classList.remove(
      "reveal-delay-1",
      "reveal-delay-2",
      "reveal-delay-3",
      "reveal-delay-4"
    );

    const delay = index % 4;

    if (delay === 1) card.classList.add("reveal-delay-1");
    if (delay === 2) card.classList.add("reveal-delay-2");
    if (delay === 3) card.classList.add("reveal-delay-3");
  });

  observerCardsProdutos = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("reveal-active");
        } else {
          entrada.target.classList.remove("reveal-active");
        }
      });
    },
    {
      threshold: 0.08,
      rootMargin: "0px 0px -30px 0px",
    }
  );

  cards.forEach((card) => {
    observerCardsProdutos.observe(card);
  });
}

/* =========================================================
   CARREGAR PRODUTOS - MAIS VENDIDOS
========================================================= */

async function carregarProdutos() {
  if (!productsGrid) return;

  try {
    const respostaTodos = await fetch(API_URL);
    const todosProdutos = await respostaTodos.json();

    if (!respostaTodos.ok) {
      mostrarToast("Erro ao carregar produtos");
      return;
    }

    produtosLoja = todosProdutos.filter((produto) => produto.ativo !== false);

    await carregarFavoritos();

    let produtosMaisVendidos = await buscarProdutosPorColecao("mais-vendidos");

    if (!produtosMaisVendidos || produtosMaisVendidos.length === 0) {
      produtosMaisVendidos = produtosLoja;
    }

    renderizarProdutos(
      produtosMaisVendidos.slice(0, LIMITE_PRODUTOS_SECAO),
      productsGrid
    );
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao conectar com o servidor");
  }
}

/* =========================================================
   CARREGAR FAVORITOS
========================================================= */

async function carregarFavoritos() {
  try {
    const resposta = await fetch(API_FAVORITOS, {
      credentials: "include",
    });

    if (!resposta.ok) {
      favoritosIds = new Set();
      return;
    }

    const favoritos = await resposta.json();

    favoritosIds = new Set(
      favoritos.map((favorito) => Number(favorito.produto_id))
    );
  } catch (error) {
    console.error(error);
    favoritosIds = new Set();
  }
}

/* =========================================================
   RENDERIZAR PRODUTOS
========================================================= */

function renderizarProdutos(listaProdutos, grid = productsGrid) {
  if (!grid) return;

  grid.innerHTML = "";

  if (!listaProdutos || listaProdutos.length === 0) {
    grid.innerHTML = `
      <div class="empty-products">
        Nenhum produto encontrado.
      </div>
    `;
    return;
  }

  listaProdutos.forEach((produto) => {
    const imagemPrincipal = pegarImagemProduto(produto);
    const nomeSeguro = String(produto.nome || "").replace(/'/g, "\\'");
    const favoritado = favoritosIds.has(Number(produto.id));

    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <button 
        type="button"
        class="favorite-button ${favoritado ? "active" : ""}"
        onclick="alternarFavorito(event, ${produto.id})"
        aria-label="Favoritar produto"
      >
        <i data-lucide="heart"></i>
      </button>

      <div class="product-image-box">
        <img src="${imagemPrincipal}" alt="${produto.nome}">
      </div>

      <div class="product-info">
        <h3>${produto.nome}</h3>

        <div class="product-price">
          R$ ${formatarPreco(produto.preco)}
        </div>

        <button 
          type="button"
          class="product-buy-button"
          onclick="event.stopPropagation(); adicionarAoCarrinho(${produto.id})"
        >
          Comprar
        </button>
      </div>
    `;

    card.addEventListener("click", () => {
      window.location.href = `/produto?id=${produto.id}`;
    });

    grid.appendChild(card);
  });

  if (window.lucide) {
    lucide.createIcons();
  }

  animarCardsProdutos();
}

/* =========================================================
   PRODUTOS POR COLEÇÃO
========================================================= */

async function buscarProdutosPorColecao(slug) {
  try {
    const resposta = await fetch(`${API_COLECOES}/${slug}/produtos`);
    const produtos = await resposta.json();

    if (!resposta.ok || !Array.isArray(produtos)) {
      console.error("Erro ao buscar coleção:", slug, produtos);
      return [];
    }

    return produtos.filter((produto) => produto.ativo !== false);
  } catch (error) {
    console.error("Erro ao buscar produtos da coleção:", slug, error);
    return [];
  }
}

async function carregarProdutosSelecionados() {
  if (!selectedProductsGrid) return;

  const sectionSelecionados = document.getElementById("produtosSelecionados");

  try {
    const produtosSelecionados = await buscarProdutosPorColecao(
      "produtos-selecionados"
    );

    if (!produtosSelecionados || produtosSelecionados.length === 0) {
      if (sectionSelecionados) {
        sectionSelecionados.style.display = "none";
      }

      return;
    }

    if (sectionSelecionados) {
      sectionSelecionados.style.display = "";
    }

    renderizarProdutos(
      produtosSelecionados.slice(0, LIMITE_PRODUTOS_SECAO),
      selectedProductsGrid
    );
  } catch (error) {
    console.error(error);

    if (sectionSelecionados) {
      sectionSelecionados.style.display = "none";
    }
  }
}

/* =========================================================
   FAVORITAR / REMOVER FAVORITO
========================================================= */

async function alternarFavorito(event, produtoId) {
  event.stopPropagation();

  const botao = event.currentTarget;
  const jaFavoritado = favoritosIds.has(Number(produtoId));

  try {
    const resposta = await fetch(`${API_FAVORITOS}/${produtoId}`, {
      method: jaFavoritado ? "DELETE" : "POST",
      credentials: "include",
    });

    if (resposta.status === 401) {
      mostrarToast("Entre na sua conta para favoritar");

      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);

      return;
    }

    if (!resposta.ok) {
      mostrarToast("Erro ao atualizar favorito");
      return;
    }

    if (jaFavoritado) {
      favoritosIds.delete(Number(produtoId));
      botao.classList.remove("active");
      mostrarToast("Produto removido dos favoritos");
    } else {
      favoritosIds.add(Number(produtoId));
      botao.classList.add("active");
      mostrarToast("Produto adicionado aos favoritos");
    }
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao conectar com o servidor");
  }
}

/* =========================================================
   FILTRO DE PRODUTOS
========================================================= */

function filtrarProdutos(termoDigitado = null) {
  const termo = String(
    termoDigitado !== null
      ? termoDigitado
      : searchInput
        ? searchInput.value
        : ""
  )
    .trim()
    .toLowerCase();

  const produtosFiltrados = produtosLoja.filter((produto) => {
    const nome = String(produto.nome || "").toLowerCase();
    const descricao = String(produto.descricao || "").toLowerCase();
    const categoria = String(produto.categoria_nome || "").toLowerCase();

    return (
      nome.includes(termo) ||
      descricao.includes(termo) ||
      categoria.includes(termo)
    );
  });

  renderizarProdutos(
    produtosFiltrados.slice(0, LIMITE_PRODUTOS_SECAO),
    productsGrid
  );
}

function irParaProdutos() {
  const produtosSection =
    document.getElementById("produtos") ||
    document.getElementById("productsGrid");

  if (produtosSection) {
    produtosSection.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

/* =========================================================
   CARRINHO
========================================================= */

async function adicionarAoCarrinho(produtoId) {

  try {

    const resposta = await fetch("http://localhost:3000/carrinho/itens", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        produto_id: produtoId,
        quantidade: 1
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(dados.erro || "Erro ao adicionar produto");
      return;
    }

    mostrarToast("Produto adicionado ao carrinho ✓");

    atualizarContadorCarrinho();

  } catch (erro) {
    console.error(erro);
    mostrarToast("Erro de conexão");
  }
}

async function atualizarContadorCarrinho() {

  try {

    const resposta = await fetch("http://localhost:3000/carrinho", {
      credentials: "include"
    });

    if (!resposta.ok) return;

    const carrinho = await resposta.json();

    const quantidade = carrinho.itens.reduce(
      (soma, item) => soma + item.quantidade,
      0
    );

    if (cartCount) {
      cartCount.textContent = quantidade;
    }

  } catch (erro) {
    console.error(erro);
  }

}

function removerDoCarrinho(id) {
  carrinho = carrinho.filter((item) => item.id !== id);

  atualizarCarrinho();
  mostrarToast("Produto removido do carrinho");
}

function abrirMenuCarrinho() {
  if (!cartDrawer || !overlay) return;

  cartDrawer.classList.add("active");
  overlay.classList.add("active");
}

function fecharMenuCarrinho() {
  if (!cartDrawer || !overlay) return;

  cartDrawer.classList.remove("active");
  overlay.classList.remove("active");
}

function finalizarPeloWhatsApp() {
  if (carrinho.length === 0) {
    mostrarToast("Seu carrinho está vazio");
    return;
  }

  let mensagem = "Olá! Tenho interesse nos produtos da Lunea:%0A%0A";

  carrinho.forEach((item) => {
    mensagem += `• ${item.nome} - Qtd: ${item.quantidade} - R$ ${formatarPreco(
      item.preco * item.quantidade
    )}%0A`;
  });

  const total = carrinho.reduce((soma, item) => {
    return soma + item.preco * item.quantidade;
  }, 0);

  mensagem += `%0ATotal: R$ ${formatarPreco(total)}`;

  const telefone = "5517996489436";

  window.open(`https://wa.me/${telefone}?text=${mensagem}`, "_blank");
}

/* =========================================================
   SESSÃO DO USUÁRIO
========================================================= */

async function verificarSessao() {
  try {
    const resposta = await fetch("http://localhost:3000/usuarios/sessao", {
      credentials: "include",
    });

    const userButton =
      document.getElementById("userButton") ||
      document.querySelector(".user-button");

    if (!userButton) return;

    userButton.href = resposta.ok ? "/perfil" : "/login";
  } catch (error) {
    console.error(error);
  }
}

/* =========================================================
   MENU MOBILE LATERAL
========================================================= */

function abrirMenuMobile() {
  if (!mobileSideMenu || !menuOverlay) return;

  mobileSideMenu.classList.add("active");
  menuOverlay.classList.add("active");
  document.body.classList.add("menu-open");
}

function fecharMenuMobile() {
  if (!mobileSideMenu || !menuOverlay) return;

  mobileSideMenu.classList.remove("active");
  menuOverlay.classList.remove("active");
  document.body.classList.remove("menu-open");
}

if (menuButton) {
  menuButton.addEventListener("click", abrirMenuMobile);
}

if (closeMobileMenu) {
  closeMobileMenu.addEventListener("click", fecharMenuMobile);
}

if (menuOverlay) {
  menuOverlay.addEventListener("click", fecharMenuMobile);
}

if (mobileSideMenu) {
  mobileSideMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", fecharMenuMobile);
  });
}

/* =========================================================
   BUSCA DESKTOP E MOBILE
========================================================= */

function abrirBuscaMobile() {
  if (!mobileSearchPanel || !mobileSearchInput) return;

  fecharMenuMobile();

  mobileSearchPanel.classList.add("active");
  document.body.classList.add("search-panel-open");

  setTimeout(() => {
    mobileSearchInput.focus();
  }, 180);
}

function fecharBuscaMobile() {
  if (!mobileSearchPanel) return;

  mobileSearchPanel.classList.remove("active");
  document.body.classList.remove("search-panel-open");
}

if (searchMobileButton) {
  searchMobileButton.addEventListener("click", abrirBuscaMobile);
}

if (mobileSearchClose) {
  mobileSearchClose.addEventListener("click", fecharBuscaMobile);
}

if (mobileSearchInput) {
  mobileSearchInput.addEventListener("input", () => {
    const termo = mobileSearchInput.value;

    if (searchInput) {
      searchInput.value = termo;
    }

    filtrarProdutos(termo);
  });

  mobileSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      filtrarProdutos(mobileSearchInput.value);
      fecharBuscaMobile();
      irParaProdutos();
    }

    if (event.key === "Escape") {
      fecharBuscaMobile();
    }
  });
}

if (mobileSearchSubmit) {
  mobileSearchSubmit.addEventListener("click", () => {
    filtrarProdutos(mobileSearchInput ? mobileSearchInput.value : "");
    fecharBuscaMobile();
    irParaProdutos();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    fecharBuscaMobile();
  }
});

/* =========================================================
   FAQ LUNEA
========================================================= */

function iniciarFaqLunea() {
  const faqItems = document.querySelectorAll(".lunea-faq-item");

  faqItems.forEach((item) => {
    const botao = item.querySelector(".lunea-faq-question");
    const resposta = item.querySelector(".lunea-faq-answer");

    if (!botao || !resposta) return;

    botao.addEventListener("click", () => {
      const estaAberto = item.classList.contains("active");

      faqItems.forEach((outroItem) => {
        const outraResposta = outroItem.querySelector(".lunea-faq-answer");

        outroItem.classList.remove("active");

        if (outraResposta) {
          outraResposta.style.maxHeight = null;
        }
      });

      if (!estaAberto) {
        item.classList.add("active");
        resposta.style.maxHeight = resposta.scrollHeight + "px";
      }
    });
  });
}

/* =========================================================
   BOTÃO PAUSAR / DESPAUSAR VÍDEO LUNEA
========================================================= */

function iniciarControleVideoLunea() {
  const video = document.getElementById("luneaVideo");
  const botao = document.getElementById("luneaVideoControl");

  if (!video || !botao) return;

  botao.addEventListener("click", () => {
    if (video.paused) {
      video.play();

      botao.innerHTML = `<i data-lucide="pause"></i>`;
      botao.setAttribute("aria-label", "Pausar vídeo");
    } else {
      video.pause();

      botao.innerHTML = `<i data-lucide="play"></i>`;
      botao.setAttribute("aria-label", "Despausar vídeo");
    }

    if (window.lucide) {
      lucide.createIcons();
    }
  });
}

/* =========================================================
   DESTAQUE HOME
========================================================= */

async function carregarDestaqueHome() {
  try {
    const resposta = await fetch(API_DESTAQUE);
    const destaque = await resposta.json();

    const destaqueHome = document.getElementById("destaqueHome");

    if (!resposta.ok) {
      if (destaqueHome) {
        destaqueHome.style.display = "none";
      }

      return;
    }

    const destaqueImagem = document.getElementById("destaqueImagem");
    const destaqueTitulo = document.getElementById("destaqueTitulo");
    const destaqueTexto = document.getElementById("destaqueTexto");
    const destaqueBotao = document.getElementById("destaqueBotao");

    if (!destaqueImagem || !destaqueTitulo || !destaqueTexto || !destaqueBotao) {
      return;
    }

    destaqueImagem.src = destaque.imagem_url;
    destaqueTitulo.textContent = destaque.titulo;
    destaqueTexto.textContent = destaque.texto;
    destaqueBotao.textContent = destaque.botao_texto || "Ver produto";

    if (destaque.produto_id) {
      destaqueBotao.href = `/produto?id=${destaque.produto_id}`;
    } else {
      destaqueBotao.href = destaque.botao_link || "#produtos";
    }

    prepararAnimacoesScroll();
  } catch (error) {
    console.error(error);
  }
}

/* =========================================================
   CATEGORIAS HOME
========================================================= */

async function carregarCategoriasHome() {
  const categoriasHomeGrid = document.getElementById("categoriasHomeGrid");

  if (!categoriasHomeGrid) return;

  try {
    const resposta = await fetch(API_CATEGORIAS);
    const categorias = await resposta.json();

    if (!resposta.ok) {
      categoriasHomeGrid.innerHTML = "";
      return;
    }

    const categoriasAtivas = categorias
      .filter((categoria) => categoria.ativo !== false)
      .slice(0, 5);

    if (categoriasAtivas.length === 0) {
      categoriasHomeGrid.innerHTML = "";
      return;
    }

    categoriasHomeGrid.innerHTML = "";

    categoriasAtivas.forEach((categoria) => {
      const card = document.createElement("a");

      card.href = `/categoria?id=${categoria.id}`;
      card.className = "home-category-card scroll-reveal";

      card.innerHTML = `
        <strong>${categoria.nome}</strong>
        <span>→</span>
      `;

      categoriasHomeGrid.appendChild(card);
    });

    prepararAnimacoesScroll();
  } catch (error) {
    console.error(error);
    categoriasHomeGrid.innerHTML = "";
  }
}

function filtrarPorCategoriaHome(nomeCategoria) {
  const termoCategoria = String(nomeCategoria || "").toLowerCase();

  const produtosFiltrados = produtosLoja.filter((produto) => {
    const categoria = String(produto.categoria_nome || "").toLowerCase();

    return categoria === termoCategoria;
  });

  renderizarProdutos(
    produtosFiltrados.slice(0, LIMITE_PRODUTOS_SECAO),
    productsGrid
  );
  irParaProdutos();
}

/* =========================================================
   DICAS HOME
========================================================= */

async function carregarDicasHome() {
  const skinTipsGrid = document.getElementById("skinTipsGrid");

  if (!skinTipsGrid) return;

  try {
    const resposta = await fetch(API_DICAS);
    const dicas = await resposta.json();

    if (!resposta.ok) {
      skinTipsGrid.innerHTML = "";
      return;
    }

    if (!dicas || dicas.length === 0) {
      skinTipsGrid.innerHTML = `
        <article class="skin-tip-card">
          <h3>Nenhuma dica cadastrada</h3>
          <p>Em breve teremos novos conteúdos para você.</p>
        </article>
      `;

      prepararAnimacoesScroll();
      return;
    }

    skinTipsGrid.innerHTML = "";

    dicas.slice(0, 4).forEach((dica, index) => {
      const card = document.createElement("article");
      card.className = "skin-tip-card scroll-reveal";

      if (index === 1) card.classList.add("reveal-delay-1");
      if (index === 2) card.classList.add("reveal-delay-2");
      if (index === 3) card.classList.add("reveal-delay-3");

      const resumoLimitado = limitarTexto(
        dica.resumo || "Veja essa dica especial da Lunea.",
        115
      );

      card.innerHTML = `
        <h3>${dica.titulo}</h3>

        <p>
          ${resumoLimitado}
        </p>

        <a href="/dica?id=${dica.id}">
          Saiba mais
          <i data-lucide="arrow-right"></i>
        </a>
      `;

      skinTipsGrid.appendChild(card);
    });

    if (window.lucide) {
      lucide.createIcons();
    }

    prepararAnimacoesScroll();
  } catch (error) {
    console.error(error);

    skinTipsGrid.innerHTML = `
      <article class="skin-tip-card">
        <h3>Erro ao carregar dicas</h3>
        <p>Não foi possível carregar os conteúdos agora.</p>
      </article>
    `;

    prepararAnimacoesScroll();
  }
}

/* =========================================================
   EVENTOS PRINCIPAIS
========================================================= */

abrirCarrinho.addEventListener("click", () => {
  window.location.href = "/carrinho";
});

if (fecharCarrinho) {
  fecharCarrinho.addEventListener("click", fecharMenuCarrinho);
}

if (overlay) {
  overlay.addEventListener("click", fecharMenuCarrinho);
}

if (finalizarPedido) {
  finalizarPedido.addEventListener("click", finalizarPeloWhatsApp);
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    filtrarProdutos(searchInput.value);
  });
}

/* =========================================================
   INICIAR
========================================================= */

async function iniciarLunea() {

  prepararAnimacoesScroll();
  iniciarFaqLunea();
  iniciarControleVideoLunea();

  await carregarProdutos();
  await carregarProdutosSelecionados();

  await atualizarContadorCarrinho();

  verificarSessao();
  carregarDestaqueHome();
  carregarCategoriasHome();
  carregarDicasHome();
}

iniciarLunea();