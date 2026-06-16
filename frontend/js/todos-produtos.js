/* ==========================================================
   todos-produtos.js — Lunea
   Card idêntico ao da home. Filtros: busca, categoria,
   coleção, ordenação. Carrinho reutilizado do script.js.
========================================================== */

const API_URL      = "http://localhost:3000/produtos";
const API_FAVORITOS = "http://localhost:3000/favoritos";
const API_CATEGORIAS = "http://localhost:3000/categorias";
const API_COLECOES  = "http://localhost:3000/colecoes";

/* --------------------------------------------------------
   ELEMENTOS
-------------------------------------------------------- */
const productsGrid       = document.getElementById("productsGrid");
const buscarProduto      = document.getElementById("buscarProduto");
const filtroCategoria    = document.getElementById("filtroCategoria");
const filtroColecao      = document.getElementById("filtroColecao");
const ordenacao          = document.getElementById("ordenacao");
const limparFiltrosBtn   = document.getElementById("limparFiltros");
const contadorResultados = document.getElementById("contadorResultados");
const emptyState         = document.getElementById("emptyState");

/* Carrinho (mesma lógica do script.js) */
const cartDrawer      = document.getElementById("cartDrawer");
const overlay         = document.getElementById("overlay");
const abrirCarrinho   = document.getElementById("openCart");
const fecharCarrinho  = document.getElementById("fecharCarrinho");
const cartItems       = document.getElementById("cartItems");
const cartCount       = document.getElementById("cartCount");
const cartTotal       = document.getElementById("cartTotal");
const finalizarPedido = document.getElementById("finalizarPedido");
const toast           = document.getElementById("toast");

/* Menu mobile */
const menuButton      = document.getElementById("menuButton");
const mobileSideMenu  = document.getElementById("mobileSideMenu");
const closeMobileMenu = document.getElementById("closeMobileMenu");
const menuOverlay     = document.getElementById("menuOverlay");

/* Busca mobile */
const searchMobileButton = document.getElementById("searchMobileButton");
const mobileSearchPanel  = document.getElementById("mobileSearchPanel");
const mobileSearchInput  = document.getElementById("mobileSearchInput");
const mobileSearchClose  = document.getElementById("mobileSearchClose");
const mobileSearchSubmit = document.getElementById("mobileSearchSubmit");

/* --------------------------------------------------------
   ESTADO
-------------------------------------------------------- */
let todosProdutos  = [];   // todos vindos da API
let favoritosIds   = new Set();
let carrinho       = JSON.parse(localStorage.getItem("lunea_carrinho") || "[]");

let observerCards  = null;

/* --------------------------------------------------------
   TOAST
-------------------------------------------------------- */
function mostrarToast(mensagem) {
  if (!toast) return;
  toast.textContent = mensagem;
  toast.classList.add("active");
  setTimeout(() => toast.classList.remove("active"), 2500);
}

/* --------------------------------------------------------
   HELPERS
-------------------------------------------------------- */
function formatarPreco(valor) {
  return Number(valor || 0).toFixed(2).replace(".", ",");
}

function pegarImagemProduto(produto) {
  if (produto.imagens && Array.isArray(produto.imagens) && produto.imagens.length > 0 && produto.imagens[0].imagem_url) {
    return produto.imagens[0].imagem_url;
  }
  if (produto.produto_imagens && produto.produto_imagens.length > 0) {
    return produto.produto_imagens[0].imagem_url;
  }
  if (produto.imagem_url) return produto.imagem_url;
  return "/assets/img/sem-imagem.png";
}

/* --------------------------------------------------------
   ANIMAÇÕES DOS CARDS (igual ao script.js)
-------------------------------------------------------- */
function animarCardsProdutos() {
  const cards = document.querySelectorAll(".product-card");

  if (observerCards) observerCards.disconnect();

  cards.forEach((card, index) => {
    card.classList.add("scroll-reveal-zoom");
    card.classList.remove("reveal-delay-1", "reveal-delay-2", "reveal-delay-3", "reveal-delay-4");
    const delay = index % 4;
    if (delay === 1) card.classList.add("reveal-delay-1");
    if (delay === 2) card.classList.add("reveal-delay-2");
    if (delay === 3) card.classList.add("reveal-delay-3");
  });

  observerCards = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("reveal-active");
        } else {
          entrada.target.classList.remove("reveal-active");
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
  );

  cards.forEach((card) => observerCards.observe(card));
}

/* --------------------------------------------------------
   RENDERIZAR — card idêntico ao da home
-------------------------------------------------------- */
function renderizar(lista) {
  productsGrid.innerHTML = "";

  // Contador
  if (contadorResultados) {
    contadorResultados.textContent =
      lista.length === 0
        ? ""
        : lista.length === 1
        ? "1 produto encontrado"
        : `${lista.length} produtos encontrados`;
  }

  // Estado vazio
  if (lista.length === 0) {
    productsGrid.style.display = "none";
    if (emptyState) emptyState.style.display = "flex";
    return;
  }

  productsGrid.style.display = "";
  if (emptyState) emptyState.style.display = "none";

  lista.forEach((produto) => {
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
        <img src="${imagemPrincipal}" alt="${produto.nome}" loading="lazy">
      </div>

      <div class="product-info">
        <h3>${produto.nome}</h3>

        <div class="product-price">
          R$ ${formatarPreco(produto.preco)}
        </div>

        <button
          type="button"
          class="product-buy-button"
          onclick="event.stopPropagation(); adicionarAoCarrinho(${produto.id}, '${nomeSeguro}', ${produto.preco})"
        >
          Comprar
        </button>
      </div>
    `;

    card.addEventListener("click", () => {
      window.location.href = `/produto?id=${produto.id}`;
    });

    productsGrid.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();

  animarCardsProdutos();
}

/* --------------------------------------------------------
   APLICAR FILTROS E ORDENAÇÃO
-------------------------------------------------------- */
function aplicarFiltros() {
  const termo     = buscarProduto.value.trim().toLowerCase();
  const categoria = filtroCategoria.value;
  const colecao   = filtroColecao.value;
  const ordem     = ordenacao.value;

  // Mostrar ou esconder botão "Limpar filtros"
  const temFiltro = termo || categoria || colecao || ordem !== "recentes";
  if (limparFiltrosBtn) {
    limparFiltrosBtn.style.display = temFiltro ? "flex" : "none";
  }

  let lista = [...todosProdutos];

  // Busca por nome
  if (termo) {
    lista = lista.filter((p) =>
      String(p.nome || "").toLowerCase().includes(termo) ||
      String(p.descricao || "").toLowerCase().includes(termo)
    );
  }

  // Filtro por categoria
  if (categoria) {
    lista = lista.filter(
      (p) => String(p.categoria_id || "") === categoria ||
             String(p.categoria_nome || "").toLowerCase() === categoria.toLowerCase()
    );
  }

  // Filtro por coleção (vindo do campo colecao_slug ou colecao_nome)
  if (colecao) {
    lista = lista.filter(
      (p) =>
        String(p.colecao_slug || "") === colecao ||
        String(p.colecao_id || "") === colecao
    );
  }

  // Ordenação
  if (ordem === "menor-preco") lista.sort((a, b) => a.preco - b.preco);
  if (ordem === "maior-preco") lista.sort((a, b) => b.preco - a.preco);
  if (ordem === "recentes")    lista.sort((a, b) => b.id - a.id);

  renderizar(lista);
}

/* --------------------------------------------------------
   LIMPAR FILTROS
-------------------------------------------------------- */
function limparTodosFiltros() {
  buscarProduto.value       = "";
  filtroCategoria.value     = "";
  filtroColecao.value       = "";
  ordenacao.value           = "recentes";
  if (limparFiltrosBtn) limparFiltrosBtn.style.display = "none";
  aplicarFiltros();
}

/* --------------------------------------------------------
   POPULAR SELECTS DE CATEGORIA E COLEÇÃO
-------------------------------------------------------- */
async function carregarCategorias() {
  try {
    const resposta = await fetch(API_CATEGORIAS);
    if (!resposta.ok) return;
    const categorias = await resposta.json();

    categorias
      .filter((c) => c.ativo !== false)
      .forEach((c) => {
        const option = document.createElement("option");
        option.value = c.id;
        option.textContent = c.nome;
        filtroCategoria.appendChild(option);
      });
  } catch (e) {
    console.error("Erro ao carregar categorias:", e);
  }
}

async function carregarColecoes() {
  try {
    const resposta = await fetch(API_COLECOES);
    if (!resposta.ok) return;
    const colecoes = await resposta.json();

    colecoes
      .filter((c) => c.ativo !== false)
      .forEach((c) => {
        const option = document.createElement("option");
        option.value = c.slug || c.id;
        option.textContent = c.nome;
        filtroColecao.appendChild(option);
      });
  } catch (e) {
    console.error("Erro ao carregar coleções:", e);
  }
}

/* --------------------------------------------------------
   CARREGAR PRODUTOS
-------------------------------------------------------- */
async function carregarProdutos() {
  try {
    // Skeleton de carregamento
    productsGrid.innerHTML = `
      ${Array(8).fill('<div class="product-card-skeleton"></div>').join("")}
    `;

    const resposta = await fetch(API_URL);
    if (!resposta.ok) {
      mostrarToast("Erro ao carregar produtos");
      return;
    }

    const dados = await resposta.json();
    todosProdutos = dados.filter((p) => p.ativo !== false);

    aplicarFiltros();
  } catch (e) {
    console.error(e);
    mostrarToast("Erro ao conectar com o servidor");
  }
}

/* --------------------------------------------------------
   FAVORITOS
-------------------------------------------------------- */
async function carregarFavoritos() {
  try {
    const resposta = await fetch(API_FAVORITOS, { credentials: "include" });
    if (!resposta.ok) { favoritosIds = new Set(); return; }
    const favoritos = await resposta.json();
    favoritosIds = new Set(favoritos.map((f) => Number(f.produto_id)));
  } catch (e) {
    favoritosIds = new Set();
  }
}

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
      setTimeout(() => (window.location.href = "/entrar"), 1000);
      return;
    }

    if (!resposta.ok) { mostrarToast("Erro ao atualizar favorito"); return; }

    if (jaFavoritado) {
      favoritosIds.delete(Number(produtoId));
      botao.classList.remove("active");
      mostrarToast("Produto removido dos favoritos");
    } else {
      favoritosIds.add(Number(produtoId));
      botao.classList.add("active");
      mostrarToast("Produto adicionado aos favoritos");
    }
  } catch (e) {
    mostrarToast("Erro ao conectar com o servidor");
  }
}

/* --------------------------------------------------------
   CARRINHO — com persistência via localStorage
-------------------------------------------------------- */
function salvarCarrinho() {
  localStorage.setItem("lunea_carrinho", JSON.stringify(carrinho));
}

function adicionarAoCarrinho(id, nome, preco) {
  const item = carrinho.find((i) => i.id === id);
  if (item) {
    item.quantidade++;
  } else {
    carrinho.push({ id, nome, preco: Number(preco), quantidade: 1 });
  }
  salvarCarrinho();
  atualizarCarrinho();
  mostrarToast("Produto adicionado ao carrinho");
}

function removerDoCarrinho(id) {
  carrinho = carrinho.filter((i) => i.id !== id);
  salvarCarrinho();
  atualizarCarrinho();
  mostrarToast("Produto removido do carrinho");
}

function atualizarCarrinho() {
  if (!cartItems || !cartCount || !cartTotal) return;

  cartItems.innerHTML = "";
  let total = 0;
  let qtdTotal = 0;

  carrinho.forEach((item) => {
    total    += item.preco * item.quantidade;
    qtdTotal += item.quantidade;

    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <h4>${item.nome}</h4>
      <p>Qtd: ${item.quantidade}</p>
      <p>R$ ${formatarPreco(item.preco * item.quantidade)}</p>
      <button onclick="removerDoCarrinho(${item.id})">Remover</button>
    `;
    cartItems.appendChild(div);
  });

  cartCount.textContent = qtdTotal;
  cartTotal.textContent = `R$ ${formatarPreco(total)}`;
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
  if (carrinho.length === 0) { mostrarToast("Seu carrinho está vazio"); return; }

  let mensagem = "Olá! Tenho interesse nos produtos da Lunea:%0A%0A";
  carrinho.forEach((item) => {
    mensagem += `• ${item.nome} - Qtd: ${item.quantidade} - R$ ${formatarPreco(item.preco * item.quantidade)}%0A`;
  });
  const total = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0);
  mensagem += `%0ATotal: R$ ${formatarPreco(total)}`;

  window.open(`https://wa.me/5517996489436?text=${mensagem}`, "_blank");
}

/* --------------------------------------------------------
   MENU MOBILE
-------------------------------------------------------- */
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

if (menuButton)      menuButton.addEventListener("click", abrirMenuMobile);
if (closeMobileMenu) closeMobileMenu.addEventListener("click", fecharMenuMobile);
if (menuOverlay)     menuOverlay.addEventListener("click", fecharMenuMobile);
if (mobileSideMenu)  mobileSideMenu.querySelectorAll("a").forEach((l) => l.addEventListener("click", fecharMenuMobile));

/* --------------------------------------------------------
   BUSCA MOBILE
-------------------------------------------------------- */
function abrirBuscaMobile() {
  if (!mobileSearchPanel) return;
  fecharMenuMobile();
  mobileSearchPanel.classList.add("active");
  document.body.classList.add("search-panel-open");
  setTimeout(() => mobileSearchInput && mobileSearchInput.focus(), 180);
}

function fecharBuscaMobile() {
  if (!mobileSearchPanel) return;
  mobileSearchPanel.classList.remove("active");
  document.body.classList.remove("search-panel-open");
}

if (searchMobileButton) searchMobileButton.addEventListener("click", abrirBuscaMobile);
if (mobileSearchClose)  mobileSearchClose.addEventListener("click", fecharBuscaMobile);

if (mobileSearchInput) {
  mobileSearchInput.addEventListener("input", () => {
    buscarProduto.value = mobileSearchInput.value;
    aplicarFiltros();
  });
  mobileSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { aplicarFiltros(); fecharBuscaMobile(); }
    if (e.key === "Escape") fecharBuscaMobile();
  });
}

if (mobileSearchSubmit) {
  mobileSearchSubmit.addEventListener("click", () => {
    aplicarFiltros();
    fecharBuscaMobile();
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharBuscaMobile();
});

/* --------------------------------------------------------
   EVENTOS DOS FILTROS
-------------------------------------------------------- */
if (buscarProduto)   buscarProduto.addEventListener("input", aplicarFiltros);
if (filtroCategoria) filtroCategoria.addEventListener("change", aplicarFiltros);
if (filtroColecao)   filtroColecao.addEventListener("change", aplicarFiltros);
if (ordenacao)       ordenacao.addEventListener("change", aplicarFiltros);
if (limparFiltrosBtn) limparFiltrosBtn.addEventListener("click", limparTodosFiltros);

/* --------------------------------------------------------
   EVENTOS DO CARRINHO
-------------------------------------------------------- */
if (abrirCarrinho)   abrirCarrinho.addEventListener("click", abrirMenuCarrinho);
if (fecharCarrinho)  fecharCarrinho.addEventListener("click", fecharMenuCarrinho);
if (overlay)         overlay.addEventListener("click", fecharMenuCarrinho);
if (finalizarPedido) finalizarPedido.addEventListener("click", finalizarPeloWhatsApp);

/* --------------------------------------------------------
   INICIALIZAR
-------------------------------------------------------- */
async function iniciar() {
  atualizarCarrinho(); // Restaura carrinho salvo

  await carregarFavoritos();
  await Promise.all([carregarCategorias(), carregarColecoes()]);
  await carregarProdutos();

  // Verificar sessão do usuário
  try {
    const resposta = await fetch("http://localhost:3000/usuarios/sessao", { credentials: "include" });
    const userButton = document.querySelector(".user-button");
    if (userButton) userButton.href = resposta.ok ? "/perfil" : "/entrar";
  } catch (e) { /* silencioso */ }
}

iniciar();