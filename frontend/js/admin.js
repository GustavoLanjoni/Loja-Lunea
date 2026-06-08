if (localStorage.getItem("lunea_admin_logado") !== "true") {
  window.location.href = "/login";
}

const API_PRODUTOS = "http://localhost:3000/produtos";
const API_CATEGORIAS = "http://localhost:3000/categorias";

const produtoForm = document.getElementById("produtoForm");
const produtoId = document.getElementById("produtoId");
const nome = document.getElementById("nome");
const descricao = document.getElementById("descricao");
const preco = document.getElementById("preco");
const estoque = document.getElementById("estoque");
const categoria_id = document.getElementById("categoria_id");
const imagens = document.getElementById("imagens");

const categoriaForm = document.getElementById("categoriaForm");
const nomeCategoria = document.getElementById("nomeCategoria");
const listaCategorias = document.getElementById("listaCategorias");

const previewImagem = document.getElementById("previewImagem");
const previewGaleria = document.getElementById("previewGaleria");
const previewCategoria = document.getElementById("previewCategoria");
const previewNome = document.getElementById("previewNome");
const previewDescricao = document.getElementById("previewDescricao");
const previewPreco = document.getElementById("previewPreco");

const totalProdutos = document.getElementById("totalProdutos");
const totalCategorias = document.getElementById("totalCategorias");
const estoqueBaixo = document.getElementById("estoqueBaixo");
const ultimosProdutos = document.getElementById("ultimosProdutos");
const produtosMaisCaros = document.getElementById("produtosMaisCaros");

const btnSalvar = document.getElementById("btnSalvar");
const btnCancelar = document.getElementById("btnCancelar");

const toast = document.getElementById("toast");

let produtos = [];
let categorias = [];

async function carregarCategorias() {
  const resposta = await fetch(API_CATEGORIAS);
  const dados = await resposta.json();

  if (!resposta.ok || !Array.isArray(dados)) {
    console.error(dados);
    mostrarToast("Erro ao carregar categorias");
    return;
  }

  categorias = dados;

  categoria_id.innerHTML = `<option value="">Selecione</option>`;

  categorias.forEach((categoria) => {
    categoria_id.innerHTML += `
      <option value="${categoria.id}">${categoria.nome}</option>
    `;
  });

  totalCategorias.textContent = categorias.length;
  renderizarCategorias();
}

function renderizarCategorias() {
  if (!listaCategorias) return;

  listaCategorias.innerHTML = "";

  if (categorias.length === 0) {
    listaCategorias.innerHTML = `
      <div class="category-empty">
        Nenhuma categoria cadastrada.
      </div>
    `;
    return;
  }

  categorias.forEach((categoria) => {
    const total = categoria.total_produtos || 0;

    const div = document.createElement("div");
    div.className = "category-item";

    div.innerHTML = `
      <div>
        <strong>${categoria.nome}</strong>
        <span>${total} produto(s)</span>
      </div>

      <button onclick="excluirCategoria(${categoria.id})">
        Excluir
      </button>
    `;

    listaCategorias.appendChild(div);
  });
}

if (categoriaForm) {
  categoriaForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nomeDigitado = nomeCategoria.value.trim();

    if (!nomeDigitado) {
      mostrarToast("Digite o nome da categoria");
      return;
    }

    const resposta = await fetch(API_CATEGORIAS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nome: nomeDigitado }),
    });

    if (!resposta.ok) {
      mostrarToast("Erro ao cadastrar categoria");
      return;
    }

    nomeCategoria.value = "";
    mostrarToast("Categoria cadastrada com sucesso");

    await carregarCategorias();
  });
}

async function excluirCategoria(id) {
  const resposta = await fetch(`${API_CATEGORIAS}/${id}`, {
    method: "DELETE",
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    mostrarToast(dados.erro || "Erro ao excluir categoria");
    return;
  }

  mostrarToast("Categoria excluída com sucesso");
  await carregarCategorias();
}

async function carregarProdutos() {
  const resposta = await fetch(API_PRODUTOS);
  const dados = await resposta.json();

  if (!resposta.ok || !Array.isArray(dados)) {
    console.error(dados);
    mostrarToast("Erro ao carregar produtos");
    return;
  }

  produtos = dados;
  totalProdutos.textContent = produtos.length;

  atualizarDashboardProdutos();

  const produtoEditarId = localStorage.getItem("lunea_produto_editar");

  if (produtoEditarId) {
    const produto = produtos.find((item) => String(item.id) === produtoEditarId);

    if (produto) {
      preencherFormularioEdicao(produto);
    }

    localStorage.removeItem("lunea_produto_editar");
  }
}

function atualizarDashboardProdutos() {
  const baixoEstoque = produtos.filter((produto) => Number(produto.estoque) <= 5);

  estoqueBaixo.textContent = baixoEstoque.length;

  const ultimos = [...produtos].slice(0, 5);

  ultimosProdutos.innerHTML = ultimos.length
    ? ""
    : `<p class="dashboard-empty">Nenhum produto cadastrado.</p>`;

  ultimos.forEach((produto) => {
    ultimosProdutos.innerHTML += `
      <div class="dashboard-item">
        <span>${produto.nome}</span>
        <strong>R$ ${Number(produto.preco).toFixed(2).replace(".", ",")}</strong>
      </div>
    `;
  });

  const maisCaros = [...produtos]
    .sort((a, b) => Number(b.preco) - Number(a.preco))
    .slice(0, 5);

  produtosMaisCaros.innerHTML = maisCaros.length
    ? ""
    : `<p class="dashboard-empty">Nenhum produto cadastrado.</p>`;

  maisCaros.forEach((produto) => {
    produtosMaisCaros.innerHTML += `
      <div class="dashboard-item">
        <span>${produto.nome}</span>
        <strong>R$ ${Number(produto.preco).toFixed(2).replace(".", ",")}</strong>
      </div>
    `;
  });
}

produtoForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const editando = produtoId.value !== "";

  if (!editando && imagens.files.length === 0) {
    mostrarToast("Selecione pelo menos uma imagem");
    return;
  }

  if (imagens.files.length > 5) {
    mostrarToast("Selecione no máximo 5 imagens");
    return;
  }

  const url = editando
    ? `${API_PRODUTOS}/${produtoId.value}`
    : API_PRODUTOS;

  const metodo = editando ? "PUT" : "POST";

  let resposta;

  if (editando) {
    const dadosProduto = {
      nome: nome.value,
      descricao: descricao.value,
      preco: Number(preco.value),
      estoque: Number(estoque.value),
      categoria_id: Number(categoria_id.value),
      ativo: true,
    };

    resposta = await fetch(url, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dadosProduto),
    });
  } else {
    const formData = new FormData();

    formData.append("nome", nome.value);
    formData.append("descricao", descricao.value);
    formData.append("preco", preco.value);
    formData.append("estoque", estoque.value);
    formData.append("categoria_id", categoria_id.value);

    for (let i = 0; i < imagens.files.length; i++) {
      formData.append("imagens", imagens.files[i]);
    }

    resposta = await fetch(url, {
      method: metodo,
      body: formData,
    });
  }

  if (!resposta.ok) {
    const erro = await resposta.json();
    console.error(erro);
    mostrarToast("Erro ao salvar produto");
    return;
  }

  mostrarToast(
    editando
      ? "Produto atualizado com sucesso"
      : "Produto cadastrado com sucesso"
  );

  limparFormulario();
  await carregarProdutos();
  await carregarCategorias();
});

function preencherFormularioEdicao(produto) {
  produtoId.value = produto.id;
  nome.value = produto.nome;
  descricao.value = produto.descricao || "";
  preco.value = produto.preco;
  estoque.value = produto.estoque;
  categoria_id.value = produto.categoria_id || "";

  const imagemPrincipal =
    produto.imagens && produto.imagens.length > 0
      ? produto.imagens[0].imagem_url
      : "";

  previewImagem.src = imagemPrincipal;
  previewGaleria.innerHTML = "";

  if (produto.imagens && produto.imagens.length > 0) {
    produto.imagens.forEach((imagemItem) => {
      const img = document.createElement("img");
      img.src = imagemItem.imagem_url;
      img.alt = produto.nome;

      img.addEventListener("click", () => {
        previewImagem.src = imagemItem.imagem_url;
      });

      previewGaleria.appendChild(img);
    });
  }

  atualizarPreview();

  btnSalvar.textContent = "Atualizar Produto";

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

btnCancelar.addEventListener("click", () => {
  limparFormulario();
});

function atualizarPreview() {
  previewNome.textContent = nome.value || "Nome do produto";

  previewDescricao.textContent =
    descricao.value || "Descrição do produto aparecerá aqui.";

  previewPreco.textContent = preco.value
    ? `R$ ${Number(preco.value).toFixed(2).replace(".", ",")}`
    : "R$ 0,00";

  const categoriaSelecionada = categoria_id.options[categoria_id.selectedIndex];

  previewCategoria.textContent =
    categoriaSelecionada && categoriaSelecionada.value
      ? categoriaSelecionada.textContent
      : "Categoria";
}

function atualizarPreviewImagens() {
  previewGaleria.innerHTML = "";

  if (imagens.files.length === 0) {
    previewImagem.src = "";
    return;
  }

  if (imagens.files.length > 5) {
    mostrarToast("Selecione no máximo 5 imagens");
    imagens.value = "";
    previewImagem.src = "";
    return;
  }

  Array.from(imagens.files).forEach((arquivo, index) => {
    const leitor = new FileReader();

    leitor.onload = () => {
      if (index === 0) {
        previewImagem.src = leitor.result;
      }

      const miniatura = document.createElement("img");
      miniatura.src = leitor.result;
      miniatura.alt = arquivo.name;

      miniatura.addEventListener("click", () => {
        previewImagem.src = leitor.result;
      });

      previewGaleria.appendChild(miniatura);
    };

    leitor.readAsDataURL(arquivo);
  });
}

function limparFormulario() {
  produtoId.value = "";
  nome.value = "";
  descricao.value = "";
  preco.value = "";
  estoque.value = "";
  categoria_id.value = "";
  imagens.value = "";

  previewImagem.src = "";
  previewGaleria.innerHTML = "";
  atualizarPreview();

  btnSalvar.textContent = "Cadastrar Produto";
}

function mostrarToast(mensagem) {
  toast.textContent = mensagem;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}



nome.addEventListener("input", atualizarPreview);
descricao.addEventListener("input", atualizarPreview);
preco.addEventListener("input", atualizarPreview);
categoria_id.addEventListener("change", atualizarPreview);
imagens.addEventListener("change", atualizarPreviewImagens);



async function iniciarPainel() {
  try {
    await carregarCategorias();
    await carregarProdutos();
    atualizarPreview();
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao carregar painel");
  }
}



iniciarPainel();