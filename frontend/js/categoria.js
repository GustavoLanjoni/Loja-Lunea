const API_PRODUTOS = "http://localhost:3000/produtos";
const API_CATEGORIAS = "http://localhost:3000/categorias";

const categoriaTitulo = document.getElementById("categoriaTitulo");
const categoriaDescricao = document.getElementById("categoriaDescricao");
const categoriaProductsGrid = document.getElementById("categoriaProductsGrid");
const toast = document.getElementById("toast");

let categoriaAtual = null;
let produtosCategoria = [];

function pegarCategoriaId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function mostrarToast(mensagem) {
  if (!toast) return;

  toast.textContent = mensagem;
  toast.classList.add("active");

  setTimeout(() => {
    toast.classList.remove("active");
  }, 2500);
}

async function carregarCategoria() {
  const categoriaId = pegarCategoriaId();

  if (!categoriaId) {
    categoriaTitulo.textContent = "Categoria não encontrada";
    categoriaDescricao.textContent = "Volte para a loja e escolha uma categoria.";
    return;
  }

  try {
    const respostaCategorias = await fetch(API_CATEGORIAS);
    const categorias = await respostaCategorias.json();

    if (!respostaCategorias.ok) {
      categoriaTitulo.textContent = "Erro ao carregar categoria";
      return;
    }

    categoriaAtual = categorias.find((categoria) => {
      return Number(categoria.id) === Number(categoriaId);
    });

    if (!categoriaAtual) {
      categoriaTitulo.textContent = "Categoria não encontrada";
      categoriaDescricao.textContent = "Essa categoria não existe ou foi removida.";
      return;
    }

    categoriaTitulo.textContent = categoriaAtual.nome;
    document.title = `${categoriaAtual.nome} | Lunea`;

    await carregarProdutosDaCategoria(categoriaAtual);

  } catch (error) {
    console.error(error);
    categoriaTitulo.textContent = "Erro ao carregar categoria";
  }
}

async function carregarProdutosDaCategoria(categoria) {
  try {
    const resposta = await fetch(API_PRODUTOS);
    const produtos = await resposta.json();

    if (!resposta.ok) {
      categoriaProductsGrid.innerHTML = `
        <div class="empty-products">
          Erro ao carregar produtos.
        </div>
      `;
      return;
    }

    produtosCategoria = produtos.filter((produto) => {
      const produtoAtivo = produto.ativo !== false;

      const mesmoId =
        Number(produto.categoria_id) === Number(categoria.id);

      const mesmoNome =
        String(produto.categoria_nome || "").toLowerCase() ===
        String(categoria.nome || "").toLowerCase();

      return produtoAtivo && (mesmoId || mesmoNome);
    });

    renderizarProdutosCategoria(produtosCategoria);

  } catch (error) {
    console.error(error);

    categoriaProductsGrid.innerHTML = `
      <div class="empty-products">
        Erro ao conectar com o servidor.
      </div>
    `;
  }
}

function renderizarProdutosCategoria(produtos) {
  categoriaProductsGrid.innerHTML = "";

  if (!produtos || produtos.length === 0) {
    categoriaProductsGrid.innerHTML = `
      <div class="empty-products">
        Nenhum produto encontrado nessa categoria.
      </div>
    `;
    return;
  }

  produtos.forEach((produto) => {
    const imagemPrincipal =
      produto.imagens && produto.imagens.length > 0
        ? produto.imagens[0].imagem_url
        : produto.imagem || "https://via.placeholder.com/400x300";

    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
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
        >
          Ver produto
        </button>
      </div>
    `;

    card.addEventListener("click", () => {
      window.location.href = `/produto?id=${produto.id}`;
    });

    const botao = card.querySelector(".product-buy-button");

    botao.addEventListener("click", (event) => {
      event.stopPropagation();
      window.location.href = `/produto?id=${produto.id}`;
    });

    categoriaProductsGrid.appendChild(card);
  });
}

carregarCategoria();