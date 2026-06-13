const API_URL = "http://localhost:3000/produtos";
const API_FAVORITOS = "http://localhost:3000/favoritos";

const productsGrid = document.getElementById("productsGrid");
const cartDrawer = document.getElementById("cartDrawer");
const overlay = document.getElementById("overlay");
const abrirCarrinho = document.getElementById("abrirCarrinho");
const fecharCarrinho = document.getElementById("fecharCarrinho");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const cartTotal = document.getElementById("cartTotal");
const finalizarPedido = document.getElementById("finalizarPedido");
const toast = document.getElementById("toast");

const searchInput = document.querySelector(".search-box input");

let carrinho = [];
let produtosLoja = [];
let favoritosIds = new Set();

/* =========================================================
   CARREGAR PRODUTOS
========================================================= */

async function carregarProdutos() {
  try {
    const resposta = await fetch(API_URL);
    const produtos = await resposta.json();

    if (!resposta.ok) {
      mostrarToast("Erro ao carregar produtos");
      return;
    }

    produtosLoja = produtos.filter((produto) => produto.ativo);

    await carregarFavoritos();

    renderizarProdutos(produtosLoja);
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao conectar com o servidor");
  }
}

/* =========================================================
   CARREGAR FAVORITOS DO USUÁRIO
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

function renderizarProdutos(listaProdutos) {
  productsGrid.innerHTML = "";

  if (listaProdutos.length === 0) {
    productsGrid.innerHTML = `
      <div class="empty-products">
        Nenhum produto encontrado.
      </div>
    `;
    return;
  }

  listaProdutos.forEach((produto) => {
    const imagemPrincipal =
      produto.imagens && produto.imagens.length > 0
        ? produto.imagens[0].imagem_url
        : produto.imagem || "https://via.placeholder.com/400x300";

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
          R$ ${Number(produto.preco).toFixed(2).replace(".", ",")}
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

  if (window.lucide) {
    lucide.createIcons();
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
        window.location.href = "/entrar";
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

function filtrarProdutos() {
  if (!searchInput) return;

  const termo = searchInput.value.trim().toLowerCase();

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

  renderizarProdutos(produtosFiltrados);
}

/* =========================================================
   CARRINHO
========================================================= */

function adicionarAoCarrinho(id, nome, preco) {
  const itemExistente = carrinho.find((item) => item.id === id);

  if (itemExistente) {
    itemExistente.quantidade++;
  } else {
    carrinho.push({
      id,
      nome,
      preco: Number(preco),
      quantidade: 1,
    });
  }

  atualizarCarrinho();
  mostrarToast("Produto adicionado ao carrinho");
}

function atualizarCarrinho() {
  cartItems.innerHTML = "";

  let total = 0;
  let quantidadeTotal = 0;

  carrinho.forEach((item) => {
    total += item.preco * item.quantidade;
    quantidadeTotal += item.quantidade;

    const div = document.createElement("div");
    div.className = "cart-item";

    div.innerHTML = `
      <h4>${item.nome}</h4>
      <p>Qtd: ${item.quantidade}</p>
      <p>R$ ${(item.preco * item.quantidade).toFixed(2).replace(".", ",")}</p>
      <button onclick="removerDoCarrinho(${item.id})">Remover</button>
    `;

    cartItems.appendChild(div);
  });

  cartCount.textContent = quantidadeTotal;
  cartTotal.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;
}

function removerDoCarrinho(id) {
  carrinho = carrinho.filter((item) => item.id !== id);

  atualizarCarrinho();
  mostrarToast("Produto removido do carrinho");
}

function abrirMenuCarrinho() {
  cartDrawer.classList.add("active");
  overlay.classList.add("active");
}

function fecharMenuCarrinho() {
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
    mensagem += `• ${item.nome} - Qtd: ${item.quantidade} - R$ ${(item.preco * item.quantidade)
      .toFixed(2)
      .replace(".", ",")}%0A`;
  });

  const total = carrinho.reduce(
    (soma, item) => soma + item.preco * item.quantidade,
    0
  );

  mensagem += `%0ATotal: R$ ${total.toFixed(2).replace(".", ",")}`;

  const telefone = "5517996489436";

  window.open(`https://wa.me/${telefone}?text=${mensagem}`, "_blank");
}

/* =========================================================
   TOAST
========================================================= */

function mostrarToast(mensagem) {
  toast.textContent = mensagem;
  toast.classList.add("active");

  setTimeout(() => {
    toast.classList.remove("active");
  }, 2500);
}

/* =========================================================
   SESSÃO DO USUÁRIO
========================================================= */

async function verificarSessao() {
  try {
    const resposta = await fetch("http://localhost:3000/usuarios/sessao", {
      credentials: "include",
    });

    const userButton = document.getElementById("userButton");

    if (!userButton) return;

    userButton.href = resposta.ok ? "/perfil" : "/entrar";
  } catch (error) {
    console.error(error);
  }
}

/* =========================================================
   MENU MOBILE LATERAL
========================================================= */

const menuButton = document.getElementById("menuButton");
const mobileSideMenu = document.getElementById("mobileSideMenu");
const closeMobileMenu = document.getElementById("closeMobileMenu");
const menuOverlay = document.getElementById("menuOverlay");
const searchMobileButton = document.getElementById("searchMobileButton");

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
   BUSCA MOBILE
========================================================= */

const mobileSearchPanel = document.getElementById("mobileSearchPanel");
const mobileSearchInput = document.getElementById("mobileSearchInput");
const mobileSearchClose = document.getElementById("mobileSearchClose");
const mobileSearchSubmit = document.getElementById("mobileSearchSubmit");

function abrirBuscaMobile() {
  if (!mobileSearchPanel || !mobileSearchInput) return;

  fecharMenuMobile();

  mobileSearchPanel.classList.add("active");
  document.body.classList.add("search-panel-open");

  setTimeout(() => {
    mobileSearchInput.focus();
  }, 150);
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
    if (!searchInput) return;

    searchInput.value = mobileSearchInput.value;
    filtrarProdutos();
  });

  mobileSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const produtosSection = document.getElementById("produtos");

      if (produtosSection) {
        produtosSection.scrollIntoView({
          behavior: "smooth",
        });
      }

      fecharBuscaMobile();
    }
  });
}

if (mobileSearchSubmit) {
  mobileSearchSubmit.addEventListener("click", () => {
    const produtosSection = document.getElementById("produtos");

    if (produtosSection) {
      produtosSection.scrollIntoView({
        behavior: "smooth",
      });
    }

    fecharBuscaMobile();
  });
}

/* =========================================================
   EVENTOS PRINCIPAIS
========================================================= */

if (abrirCarrinho) {
  abrirCarrinho.addEventListener("click", abrirMenuCarrinho);
}

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
  searchInput.addEventListener("input", filtrarProdutos);
}

/* =========================================================
   INICIAR
========================================================= */

carregarProdutos();
verificarSessao();