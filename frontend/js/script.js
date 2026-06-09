const API_URL = "http://localhost:3000/produtos";

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

async function carregarProdutos() {
  try {
    const resposta = await fetch(API_URL);
    const produtos = await resposta.json();

    produtosLoja = produtos.filter((produto) => produto.ativo);

    renderizarProdutos(produtosLoja);
  } catch (error) {
    mostrarToast("Erro ao carregar produtos");
    console.error(error);
  }
}

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

    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <img src="${imagemPrincipal}" alt="${produto.nome}">

      <div class="product-info">
        <span class="product-category">
          ${produto.categoria_nome || "Lunea"}
        </span>

        <h3>${produto.nome}</h3>

        <p>${produto.descricao || "Produto Lunea"}</p>

        <div class="product-price">
          R$ ${Number(produto.preco).toFixed(2).replace(".", ",")}
        </div>

        <div class="product-actions">
          <button onclick="adicionarAoCarrinho(${produto.id}, '${produto.nome.replace(/'/g, "\\'")}', ${produto.preco})">
            Adicionar ao carrinho
          </button>
        </div>
      </div>
    `;

    productsGrid.appendChild(card);
  });
}

function filtrarProdutos() {
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

function mostrarToast(mensagem) {
  toast.textContent = mensagem;
  toast.classList.add("active");

  setTimeout(() => {
    toast.classList.remove("active");
  }, 2500);
}

abrirCarrinho.addEventListener("click", abrirMenuCarrinho);
fecharCarrinho.addEventListener("click", fecharMenuCarrinho);
overlay.addEventListener("click", fecharMenuCarrinho);
finalizarPedido.addEventListener("click", finalizarPeloWhatsApp);

if (searchInput) {
  searchInput.addEventListener("input", filtrarProdutos);
}

carregarProdutos();