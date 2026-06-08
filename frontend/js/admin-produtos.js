if (localStorage.getItem("lunea_admin_logado") !== "true") {
  window.location.href = "/login";
}

const API_PRODUTOS = "http://localhost:3000/produtos";
const API_CATEGORIAS = "http://localhost:3000/categorias";

const tabelaProdutos = document.getElementById("tabelaProdutos");
const buscarProduto = document.getElementById("buscarProduto");
const filtroCategoria = document.getElementById("filtroCategoria");

const toast = document.getElementById("toast");

const modalOverlay = document.getElementById("modalOverlay");
const cancelarExclusao = document.getElementById("cancelarExclusao");
const confirmarExclusao = document.getElementById("confirmarExclusao");

const imageViewer = document.getElementById("imageViewer");
const viewerMainImage = document.getElementById("viewerMainImage");
const viewerThumbnails = document.getElementById("viewerThumbnails");
const closeViewer = document.getElementById("closeViewer");

let produtos = [];
let categorias = [];
let produtoParaExcluir = null;

async function carregarCategorias() {
  try {
    const resposta = await fetch(API_CATEGORIAS);
    const dados = await resposta.json();

    if (!resposta.ok || !Array.isArray(dados)) {
      console.error(dados);
      mostrarToast("Erro ao carregar categorias");
      return;
    }

    categorias = dados;

    filtroCategoria.innerHTML = `<option value="">Todas categorias</option>`;

    categorias.forEach((categoria) => {
      filtroCategoria.innerHTML += `
        <option value="${categoria.id}">${categoria.nome}</option>
      `;
    });
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao conectar com categorias");
  }
}

async function carregarProdutos() {
  try {
    const resposta = await fetch(API_PRODUTOS);
    const dados = await resposta.json();

    if (!resposta.ok || !Array.isArray(dados)) {
      console.error(dados);
      mostrarToast("Erro ao carregar produtos");
      return;
    }

    produtos = dados;
    renderizarProdutos();
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao conectar com produtos");
  }
}

function renderizarProdutos() {
  const termo = buscarProduto.value.trim().toLowerCase();
  const categoriaSelecionada = filtroCategoria.value;

  const produtosFiltrados = produtos.filter((produto) => {
    const nomeProduto = String(produto.nome || "").toLowerCase();

    const correspondeNome = nomeProduto.includes(termo);

    const correspondeCategoria =
      categoriaSelecionada === "" ||
      String(produto.categoria_id) === categoriaSelecionada;

    return correspondeNome && correspondeCategoria;
  });

  tabelaProdutos.innerHTML = "";

  if (produtosFiltrados.length === 0) {
    tabelaProdutos.innerHTML = `
      <tr>
        <td colspan="6" class="empty-table">
          Nenhum produto encontrado.
        </td>
      </tr>
    `;
    return;
  }

  produtosFiltrados.forEach((produto) => {
    const imagemPrincipal =
      produto.imagens && produto.imagens.length > 0
        ? produto.imagens[0].imagem_url
        : "";

    const tr = document.createElement("tr");

    const imagemHtml = imagemPrincipal
      ? `
        <img
          src="${imagemPrincipal}"
          alt="${produto.nome}"
          class="produto-img-click"
          onclick="abrirGaleria(${produto.id})"
        >
      `
      : `
        <div class="produto-sem-imagem">
          Sem imagem
        </div>
      `;

    tr.innerHTML = `
      <td>
        <div class="produto-info-tabela">
          ${imagemHtml}
          <span>${produto.nome}</span>
        </div>
      </td>

      <td>${produto.categoria_nome || "Sem categoria"}</td>

      <td>R$ ${Number(produto.preco || 0).toFixed(2).replace(".", ",")}</td>

      <td>${produto.estoque ?? 0}</td>

      <td>
        <span class="status ${produto.ativo ? "ativo" : "inativo"}">
          ${produto.ativo ? "Ativo" : "Inativo"}
        </span>
      </td>

      <td>
        <div class="actions">
          <button class="editar" onclick="editarProduto(${produto.id})">
            Editar
          </button>

          <button class="excluir" onclick="abrirModalExclusao(${produto.id})">
            Excluir
          </button>
        </div>
      </td>
    `;

    tabelaProdutos.appendChild(tr);
  });
}

function editarProduto(id) {
  localStorage.setItem("lunea_produto_editar", String(id));
  window.location.href = "/admin";
}

function abrirModalExclusao(id) {
  produtoParaExcluir = id;
  modalOverlay.classList.add("show");
}

function fecharModalExclusao() {
  produtoParaExcluir = null;
  modalOverlay.classList.remove("show");
}

confirmarExclusao.addEventListener("click", async () => {
  if (!produtoParaExcluir) return;

  try {
    const resposta = await fetch(`${API_PRODUTOS}/${produtoParaExcluir}`, {
      method: "DELETE",
    });

    if (!resposta.ok) {
      mostrarToast("Erro ao excluir produto");
      return;
    }

    mostrarToast("Produto excluído com sucesso");
    fecharModalExclusao();
    await carregarProdutos();
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao conectar com o servidor");
  }
});

cancelarExclusao.addEventListener("click", fecharModalExclusao);

modalOverlay.addEventListener("click", (event) => {
  if (event.target === modalOverlay) {
    fecharModalExclusao();
  }
});

function abrirGaleria(produtoId) {
  const produto = produtos.find((item) => item.id === produtoId);

  if (!produto || !produto.imagens || produto.imagens.length === 0) {
    mostrarToast("Esse produto não possui imagens");
    return;
  }

  imageViewer.classList.add("show");

  viewerMainImage.src = produto.imagens[0].imagem_url;

  viewerThumbnails.innerHTML = "";

  produto.imagens.forEach((imagem) => {
    const img = document.createElement("img");
    img.src = imagem.imagem_url;
    img.alt = produto.nome;

    img.addEventListener("click", () => {
      viewerMainImage.src = imagem.imagem_url;
    });

    viewerThumbnails.appendChild(img);
  });
}

closeViewer.addEventListener("click", () => {
  imageViewer.classList.remove("show");
});

imageViewer.addEventListener("click", (event) => {
  if (event.target === imageViewer) {
    imageViewer.classList.remove("show");
  }
});

buscarProduto.addEventListener("input", renderizarProdutos);
filtroCategoria.addEventListener("change", renderizarProdutos);

function mostrarToast(mensagem) {
  toast.textContent = mensagem;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

async function iniciarPagina() {
  await carregarCategorias();
  await carregarProdutos();
}

iniciarPagina();