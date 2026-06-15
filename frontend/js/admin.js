if (localStorage.getItem("lunea_admin_logado") !== "true") {
  window.location.href = "/login";
}

const API_PRODUTOS = "http://localhost:3000/produtos";
const API_CATEGORIAS = "http://localhost:3000/categorias";
const API_COLECOES = "http://localhost:3000/colecoes";

const produtoForm = document.getElementById("produtoForm");
const produtoId = document.getElementById("produtoId");
const nome = document.getElementById("nome");
const descricao = document.getElementById("descricao");
const preco = document.getElementById("preco");
const estoque = document.getElementById("estoque");
const categoria_id = document.getElementById("categoria_id");
const imagens = document.getElementById("imagens");

const colecoesOptions = document.getElementById("colecoesOptions");

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
let colecoes = [];

/* =========================================================
   TOAST
========================================================= */

function mostrarToast(mensagem) {
  if (!toast) return;

  toast.textContent = mensagem;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* =========================================================
   LER RESPOSTA COM SEGURANÇA
========================================================= */

async function lerRespostaSegura(resposta) {
  const texto = await resposta.text();

  try {
    return JSON.parse(texto);
  } catch (error) {
    console.error("Resposta do servidor não veio em JSON:");
    console.error(texto);

    return {
      erro: "O servidor retornou HTML ou texto em vez de JSON.",
      respostaOriginal: texto,
    };
  }
}

/* =========================================================
   VALIDAÇÕES DO PRODUTO
========================================================= */

function validarProdutoAntesDeEnviar() {
  const nomeValor = nome.value.trim();
  const descricaoValor = descricao.value.trim();
  const precoValor = Number(preco.value);
  const estoqueValor = Number(estoque.value);
  const categoriaValor = Number(categoria_id.value);

  if (!nomeValor) {
    mostrarToast("Digite o nome do produto");
    return false;
  }

  if (!descricaoValor) {
    mostrarToast("Digite a descrição do produto");
    return false;
  }

  if (!preco.value || Number.isNaN(precoValor) || precoValor <= 0) {
    mostrarToast("Digite um preço válido");
    return false;
  }

  if (!estoque.value || Number.isNaN(estoqueValor) || estoqueValor < 0) {
    mostrarToast("Digite um estoque válido");
    return false;
  }

  if (!categoria_id.value || Number.isNaN(categoriaValor)) {
    mostrarToast("Selecione uma categoria");
    return false;
  }

  return true;
}

function validarTamanhoDasImagens() {
  const LIMITE_IMAGEM_MB = 10;
  const LIMITE_IMAGEM_BYTES = LIMITE_IMAGEM_MB * 1024 * 1024;

  if (!imagens || imagens.files.length === 0) {
    return true;
  }

  for (let i = 0; i < imagens.files.length; i++) {
    const arquivo = imagens.files[i];

    if (arquivo.size > LIMITE_IMAGEM_BYTES) {
      mostrarToast(`A imagem "${arquivo.name}" passa de ${LIMITE_IMAGEM_MB}MB`);
      return false;
    }
  }

  return true;
}

/* =========================================================
   CATEGORIAS
========================================================= */

async function carregarCategorias() {
  try {
    const resposta = await fetch(API_CATEGORIAS);
    const dados = await lerRespostaSegura(resposta);

    if (!resposta.ok || !Array.isArray(dados)) {
      console.error(dados);
      mostrarToast("Erro ao carregar categorias");
      return;
    }

    categorias = dados;

    if (categoria_id) {
      categoria_id.innerHTML = `<option value="">Selecione</option>`;

      categorias.forEach((categoria) => {
        categoria_id.innerHTML += `
          <option value="${categoria.id}">${categoria.nome}</option>
        `;
      });
    }

    if (totalCategorias) {
      totalCategorias.textContent = categorias.length;
    }

    renderizarCategorias();
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao carregar categorias");
  }
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

    try {
      const resposta = await fetch(API_CATEGORIAS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome: nomeDigitado }),
      });

      const dados = await lerRespostaSegura(resposta);

      if (!resposta.ok) {
        console.error(dados);
        mostrarToast(dados.erro || "Erro ao cadastrar categoria");
        return;
      }

      nomeCategoria.value = "";
      mostrarToast("Categoria cadastrada com sucesso");

      await carregarCategorias();
    } catch (error) {
      console.error(error);
      mostrarToast("Erro ao cadastrar categoria");
    }
  });
}

async function excluirCategoria(id) {
  try {
    const resposta = await fetch(`${API_CATEGORIAS}/${id}`, {
      method: "DELETE",
    });

    const dados = await lerRespostaSegura(resposta);

    if (!resposta.ok) {
      mostrarToast(dados.erro || "Erro ao excluir categoria");
      return;
    }

    mostrarToast("Categoria excluída com sucesso");
    await carregarCategorias();
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao excluir categoria");
  }
}

/* =========================================================
   COLEÇÕES DA LOJA
========================================================= */

async function carregarColecoes() {
  if (!colecoesOptions) return;

  try {
    colecoesOptions.innerHTML = `
      <p class="collections-loading">Carregando coleções...</p>
    `;

    const resposta = await fetch(`${API_COLECOES}/admin`);
    const dados = await lerRespostaSegura(resposta);

    if (!resposta.ok || !Array.isArray(dados)) {
      console.error(dados);
      colecoesOptions.innerHTML = `
        <p class="collections-loading">Erro ao carregar coleções.</p>
      `;
      mostrarToast("Erro ao carregar coleções");
      return;
    }

    colecoes = dados;

    renderizarColecoes();
  } catch (error) {
    console.error(error);
    colecoesOptions.innerHTML = `
      <p class="collections-loading">Erro ao carregar coleções.</p>
    `;
    mostrarToast("Erro ao carregar coleções");
  }
}

function renderizarColecoes() {
  if (!colecoesOptions) return;

  if (colecoes.length === 0) {
    colecoesOptions.innerHTML = `
      <p class="collections-loading">
        Nenhuma coleção cadastrada.
      </p>
    `;
    return;
  }

  colecoesOptions.innerHTML = "";

  colecoes.forEach((colecao) => {
    const label = document.createElement("label");
    label.className = "collection-check";

    label.innerHTML = `
      <input
        type="checkbox"
        name="colecoes"
        value="${colecao.id}"
      />
      <span>${colecao.nome}</span>
    `;

    colecoesOptions.appendChild(label);
  });
}

function obterColecoesSelecionadas() {
  if (!colecoesOptions) return [];

  const selecionadas = colecoesOptions.querySelectorAll(
    'input[name="colecoes"]:checked'
  );

  return Array.from(selecionadas).map((checkbox) =>
    Number(checkbox.value)
  );
}

async function salvarColecoesDoProduto(produtoSalvoId) {
  if (!produtoSalvoId || !colecoesOptions) return;

  const colecoesSelecionadas = obterColecoesSelecionadas();

  const resposta = await fetch(`${API_COLECOES}/produto`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      produto_id: Number(produtoSalvoId),
      colecoes_ids: colecoesSelecionadas,
    }),
  });

  const dados = await lerRespostaSegura(resposta);

  if (!resposta.ok) {
    console.error(dados);
    mostrarToast(dados.erro || "Produto salvo, mas erro ao salvar coleções");
    return;
  }
}

async function marcarColecoesDoProduto(produtoEditarId) {
  if (!produtoEditarId || !colecoesOptions) return;

  try {
    const resposta = await fetch(`${API_COLECOES}/produto/${produtoEditarId}`);
    const dados = await lerRespostaSegura(resposta);

    if (!resposta.ok || !Array.isArray(dados)) {
      console.error(dados);
      return;
    }

    const idsSelecionados = dados.map((colecao) => Number(colecao.id));

    const checkboxes = colecoesOptions.querySelectorAll('input[name="colecoes"]');

    checkboxes.forEach((checkbox) => {
      checkbox.checked = idsSelecionados.includes(Number(checkbox.value));
    });
  } catch (error) {
    console.error(error);
  }
}

/* =========================================================
   PRODUTOS
========================================================= */

async function carregarProdutos() {
  try {
    const resposta = await fetch(API_PRODUTOS);
    const dados = await lerRespostaSegura(resposta);

    if (!resposta.ok || !Array.isArray(dados)) {
      console.error(dados);
      mostrarToast("Erro ao carregar produtos");
      return;
    }

    produtos = dados;

    if (totalProdutos) {
      totalProdutos.textContent = produtos.length;
    }

    atualizarDashboardProdutos();

    const produtoEditarId = localStorage.getItem("lunea_produto_editar");

    if (produtoEditarId) {
      const produto = produtos.find((item) => String(item.id) === produtoEditarId);

      if (produto) {
        preencherFormularioEdicao(produto);
        await marcarColecoesDoProduto(produto.id);
      }

      localStorage.removeItem("lunea_produto_editar");
    }
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao carregar produtos");
  }
}

function atualizarDashboardProdutos() {
  if (estoqueBaixo) {
    const baixoEstoque = produtos.filter((produto) => Number(produto.estoque) <= 5);
    estoqueBaixo.textContent = baixoEstoque.length;
  }

  if (ultimosProdutos) {
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
  }

  if (produtosMaisCaros) {
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
}

/* =========================================================
   SALVAR PRODUTO
========================================================= */

if (produtoForm) {
  produtoForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const editando = produtoId.value !== "";

    if (!validarProdutoAntesDeEnviar()) {
      return;
    }

    if (!editando && imagens.files.length === 0) {
      mostrarToast("Selecione pelo menos uma imagem");
      return;
    }

    if (imagens.files.length > 5) {
      mostrarToast("Selecione no máximo 5 imagens");
      return;
    }

    if (!validarTamanhoDasImagens()) {
      return;
    }

    const url = editando
      ? `${API_PRODUTOS}/${produtoId.value}`
      : API_PRODUTOS;

    const metodo = editando ? "PUT" : "POST";

    try {
      let resposta;

      if (editando) {
        const dadosProduto = {
          nome: nome.value.trim(),
          descricao: descricao.value.trim(),
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

        formData.append("nome", nome.value.trim());
        formData.append("descricao", descricao.value.trim());
        formData.append("preco", String(Number(preco.value)));
        formData.append("estoque", String(Number(estoque.value)));
        formData.append("categoria_id", String(Number(categoria_id.value)));

        for (let i = 0; i < imagens.files.length; i++) {
          formData.append("imagens", imagens.files[i]);
        }

        resposta = await fetch(url, {
          method: metodo,
          body: formData,
        });
      }

      const dados = await lerRespostaSegura(resposta);

      if (!resposta.ok) {
        console.error("Erro ao salvar produto:", dados);
        mostrarToast(dados.erro || "Erro ao salvar produto");
        return;
      }

      const produtoSalvoId =
        dados.id ||
        dados.produto?.id ||
        produtoId.value;

      if (produtoSalvoId) {
        await salvarColecoesDoProduto(produtoSalvoId);
      }

      mostrarToast(
        editando
          ? "Produto atualizado com sucesso"
          : "Produto cadastrado com sucesso"
      );

      limparFormulario();

      await carregarProdutos();
      await carregarCategorias();
      await carregarColecoes();
    } catch (error) {
      console.error(error);
      mostrarToast("Erro ao salvar produto");
    }
  });
}

/* =========================================================
   EDIÇÃO DE PRODUTO
========================================================= */

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

  if (btnSalvar) {
    btnSalvar.textContent = "Atualizar Produto";
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

if (btnCancelar) {
  btnCancelar.addEventListener("click", () => {
    limparFormulario();
  });
}

/* =========================================================
   PREVIEW DO PRODUTO
========================================================= */

function atualizarPreview() {
  if (previewNome) {
    previewNome.textContent = nome.value || "Nome do produto";
  }

  if (previewDescricao) {
    previewDescricao.textContent =
      descricao.value || "Descrição do produto aparecerá aqui.";
  }

  if (previewPreco) {
    previewPreco.textContent = preco.value
      ? `R$ ${Number(preco.value).toFixed(2).replace(".", ",")}`
      : "R$ 0,00";
  }

  if (previewCategoria && categoria_id) {
    const categoriaSelecionada = categoria_id.options[categoria_id.selectedIndex];

    previewCategoria.textContent =
      categoriaSelecionada && categoriaSelecionada.value
        ? categoriaSelecionada.textContent
        : "Categoria";
  }
}

function atualizarPreviewImagens() {
  if (!previewGaleria || !previewImagem || !imagens) return;

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

  if (!validarTamanhoDasImagens()) {
    imagens.value = "";
    previewImagem.src = "";
    previewGaleria.innerHTML = "";
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
  if (produtoId) produtoId.value = "";
  if (nome) nome.value = "";
  if (descricao) descricao.value = "";
  if (preco) preco.value = "";
  if (estoque) estoque.value = "";
  if (categoria_id) categoria_id.value = "";
  if (imagens) imagens.value = "";

  if (previewImagem) previewImagem.src = "";
  if (previewGaleria) previewGaleria.innerHTML = "";

  if (colecoesOptions) {
    const checkboxes = colecoesOptions.querySelectorAll('input[name="colecoes"]');

    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });
  }

  atualizarPreview();

  if (btnSalvar) {
    btnSalvar.textContent = "Cadastrar Produto";
  }
}

/* =========================================================
   EVENTOS DO PREVIEW
========================================================= */

if (nome) {
  nome.addEventListener("input", atualizarPreview);
}

if (descricao) {
  descricao.addEventListener("input", atualizarPreview);
}

if (preco) {
  preco.addEventListener("input", atualizarPreview);
}

if (categoria_id) {
  categoria_id.addEventListener("change", atualizarPreview);
}

if (imagens) {
  imagens.addEventListener("change", atualizarPreviewImagens);
}

/* =========================================================
   ABAS EXPANSÍVEIS - ADMIN
========================================================= */

function iniciarAccordionsAdmin() {
  const accordions = [
    {
      botaoId: "toggleProdutoForm",
      conteudoId: "produtoFormContent",
    },
    {
      botaoId: "toggleCategoriaForm",
      conteudoId: "categoriaFormContent",
    },
  ];

  accordions.forEach((accordion) => {
    const botao = document.getElementById(accordion.botaoId);
    const conteudo = document.getElementById(accordion.conteudoId);

    if (!botao || !conteudo) return;

    botao.addEventListener("click", () => {
      botao.classList.toggle("active");
      conteudo.classList.toggle("active");

      if (window.lucide) {
        lucide.createIcons();
      }
    });
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

/* =========================================================
   SUBMENU PRODUTOS - ADMIN
========================================================= */

function iniciarSubmenuProdutosAdmin() {
  const botao = document.getElementById("toggleProdutosMenu");

  if (!botao) return;

  const dropdown = botao.closest(".menu-dropdown");

  if (!dropdown) return;

  botao.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    dropdown.classList.toggle("active");

    if (window.lucide) {
      lucide.createIcons();
    }
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

/* =========================================================
   INICIAR PAINEL
========================================================= */

async function iniciarPainel() {
  try {
    await carregarCategorias();
    await carregarColecoes();
    await carregarProdutos();
    atualizarPreview();
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao carregar painel");
  }
}

iniciarSubmenuProdutosAdmin();
iniciarAccordionsAdmin();
iniciarPainel();