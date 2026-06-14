const API_DICAS_ADMIN = "http://localhost:3000/dicas";
const API_PRODUTOS_ADMIN = "http://localhost:3000/produtos";

const dicaForm = document.getElementById("dicaForm");
const dicaId = document.getElementById("dicaId");
const dicaTitulo = document.getElementById("dicaTitulo");
const dicaResumo = document.getElementById("dicaResumo");
const dicaConteudo = document.getElementById("dicaConteudo");
const dicaAtivo = document.getElementById("dicaAtivo");
const produtosSelectList = document.getElementById("produtosSelectList");
const dicasList = document.getElementById("dicasList");
const btnNovaDica = document.getElementById("btnNovaDica");
const formTitulo = document.getElementById("formTitulo");

const previewDicaTitulo = document.getElementById("previewDicaTitulo");
const previewDicaResumo = document.getElementById("previewDicaResumo");

let produtosAdmin = [];
let dicaParaExcluir = null;

/* =========================================================
   TOAST
========================================================= */

function mostrarToastAdmin(mensagem) {
  let toast = document.getElementById("adminToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "adminToast";
    toast.className = "admin-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = mensagem;
  toast.classList.add("active");

  setTimeout(() => {
    toast.classList.remove("active");
  }, 2600);
}

/* =========================================================
   MODAL MODERNO DE EXCLUSÃO
========================================================= */

function criarModalExclusao() {
  let modal = document.getElementById("modalExcluirDica");

  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "modalExcluirDica";
  modal.className = "delete-modal-overlay";

  modal.innerHTML = `
    <div class="delete-modal">
      <div class="delete-modal-icon">
        <i data-lucide="trash-2"></i>
      </div>

      <h3>Excluir dica?</h3>

      <p>
        Essa ação vai remover a dica da loja e não poderá ser desfeita.
      </p>

      <div class="delete-modal-actions">
        <button type="button" class="modal-cancel-btn" id="cancelarExclusaoDica">
          Cancelar
        </button>

        <button type="button" class="modal-delete-btn" id="confirmarExclusaoDica">
          Excluir dica
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const cancelar = document.getElementById("cancelarExclusaoDica");
  const confirmar = document.getElementById("confirmarExclusaoDica");

  cancelar.addEventListener("click", fecharModalExclusao);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      fecharModalExclusao();
    }
  });

  confirmar.addEventListener("click", confirmarExcluirDica);

  if (window.lucide) {
    lucide.createIcons();
  }

  return modal;
}

function abrirModalExclusao(id) {
  dicaParaExcluir = id;

  const modal = criarModalExclusao();
  modal.classList.add("active");
}

function fecharModalExclusao() {
  const modal = document.getElementById("modalExcluirDica");

  if (modal) {
    modal.classList.remove("active");
  }

  dicaParaExcluir = null;
}

/* =========================================================
   HELPERS
========================================================= */

function formatarPreco(valor) {
  return Number(valor || 0).toFixed(2).replace(".", ",");
}

function limitarTextoAdmin(texto, limite = 115) {
  if (!texto) return "";

  const textoLimpo = String(texto).trim();

  if (textoLimpo.length <= limite) {
    return textoLimpo;
  }

  return textoLimpo.substring(0, limite).trim() + "...";
}

function pegarImagemProduto(produto) {
  if (produto.imagens && produto.imagens.length > 0) {
    const imagensOrdenadas = [...produto.imagens].sort((a, b) => {
      return Number(a.ordem || 0) - Number(b.ordem || 0);
    });

    return imagensOrdenadas[0].imagem_url;
  }

  if (produto.produto_imagens && produto.produto_imagens.length > 0) {
    const imagensOrdenadas = [...produto.produto_imagens].sort((a, b) => {
      return Number(a.ordem || 0) - Number(b.ordem || 0);
    });

    return imagensOrdenadas[0].imagem_url;
  }

  return produto.imagem || "https://via.placeholder.com/100x100";
}

/* =========================================================
   PREVIEW DA DICA
========================================================= */

function atualizarPreviewDica() {
  if (!previewDicaTitulo || !previewDicaResumo) return;

  const titulo = dicaTitulo.value.trim();
  const resumo = dicaResumo.value.trim();

  previewDicaTitulo.textContent = titulo || "Título da dica";

  previewDicaResumo.textContent = limitarTextoAdmin(
    resumo || "Resumo da dica aparecerá aqui.",
    115
  );

  if (window.lucide) {
    lucide.createIcons();
  }
}

if (dicaTitulo) {
  dicaTitulo.addEventListener("input", atualizarPreviewDica);
}

if (dicaResumo) {
  dicaResumo.addEventListener("input", atualizarPreviewDica);
}

/* =========================================================
   PRODUTOS
========================================================= */

async function carregarProdutosAdmin() {
  try {
    const resposta = await fetch(API_PRODUTOS_ADMIN);
    const produtos = await resposta.json();

    if (!resposta.ok) {
      produtosSelectList.innerHTML = "Erro ao carregar produtos";
      return;
    }

    produtosAdmin = produtos.filter((produto) => produto.ativo !== false);

    renderizarProdutosCheckbox();

  } catch (error) {
    console.error(error);
    produtosSelectList.innerHTML = "Erro ao conectar com o servidor";
  }
}

function renderizarProdutosCheckbox(produtosSelecionados = []) {
  produtosSelectList.innerHTML = "";

  if (produtosAdmin.length === 0) {
    produtosSelectList.innerHTML = "Nenhum produto cadastrado.";
    return;
  }

  produtosAdmin.forEach((produto) => {
    const imagem = pegarImagemProduto(produto);
    const marcado = produtosSelecionados.includes(Number(produto.id));

    const label = document.createElement("label");
    label.className = "product-check-item";

    label.innerHTML = `
      <img src="${imagem}" alt="${produto.nome}">

      <div>
        <strong>${produto.nome}</strong>
        <small>R$ ${formatarPreco(produto.preco)}</small>
      </div>

      <input 
        type="checkbox" 
        value="${produto.id}" 
        ${marcado ? "checked" : ""}
      >
    `;

    produtosSelectList.appendChild(label);
  });
}

function pegarProdutosSelecionados() {
  const checks = produtosSelectList.querySelectorAll("input[type='checkbox']:checked");

  return Array.from(checks).map((check) => Number(check.value));
}

/* =========================================================
   DICAS
========================================================= */

async function carregarDicasAdmin() {
  try {
    const resposta = await fetch(`${API_DICAS_ADMIN}/admin`);
    const dicas = await resposta.json();

    if (!resposta.ok) {
      dicasList.innerHTML = "Erro ao carregar dicas.";
      return;
    }

    renderizarDicasAdmin(dicas);

  } catch (error) {
    console.error(error);
    dicasList.innerHTML = "Erro ao conectar com o servidor.";
  }
}

function renderizarDicasAdmin(dicas) {
  dicasList.innerHTML = "";

  if (!dicas || dicas.length === 0) {
    dicasList.innerHTML = `
      <div class="dica-empty">
        Nenhuma dica cadastrada ainda.
      </div>
    `;
    return;
  }

  dicas.forEach((dica) => {
    const item = document.createElement("div");
    item.className = "dica-item";

    const resumo = limitarTextoAdmin(
      dica.resumo || "Sem resumo cadastrado.",
      150
    );

    item.innerHTML = `
      <div class="dica-item-top">
        <div>
          <h3>${dica.titulo}</h3>
          <p>${resumo}</p>
        </div>

        <span class="dica-status ${dica.ativo ? "active" : "inactive"}">
          ${dica.ativo ? "Ativa" : "Inativa"}
        </span>
      </div>

      <div class="dica-actions">
        <button class="btn-edit" type="button" onclick="editarDica(${dica.id})">
          Editar
        </button>

        <button class="btn-delete" type="button" onclick="excluirDica(${dica.id})">
          Excluir
        </button>
      </div>
    `;

    dicasList.appendChild(item);
  });
}

async function editarDica(id) {
  try {
    const resposta = await fetch(`${API_DICAS_ADMIN}/${id}`);
    const resultado = await resposta.json();

    if (!resposta.ok) {
      mostrarToastAdmin("Erro ao carregar dica");
      return;
    }

    const dica = resultado.dica;

    dicaId.value = dica.id;
    dicaTitulo.value = dica.titulo || "";
    dicaResumo.value = dica.resumo || "";
    dicaConteudo.value = dica.conteudo || "";
    dicaAtivo.checked = dica.ativo;

    const produtosSelecionados = (resultado.produtos || []).map((item) => {
      return Number(item.produto_id);
    });

    renderizarProdutosCheckbox(produtosSelecionados);

    formTitulo.textContent = "Editar dica";

    atualizarPreviewDica();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

  } catch (error) {
    console.error(error);
    mostrarToastAdmin("Erro ao conectar com o servidor");
  }
}

function excluirDica(id) {
  abrirModalExclusao(id);
}

async function confirmarExcluirDica() {
  if (!dicaParaExcluir) return;

  try {
    const resposta = await fetch(`${API_DICAS_ADMIN}/${dicaParaExcluir}`, {
      method: "DELETE",
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      mostrarToastAdmin(resultado.erro || "Erro ao excluir dica");
      return;
    }

    mostrarToastAdmin("Dica excluída com sucesso");

    fecharModalExclusao();
    limparFormulario();
    carregarDicasAdmin();

  } catch (error) {
    console.error(error);
    mostrarToastAdmin("Erro ao conectar com o servidor");
  }
}

/* =========================================================
   FORMULÁRIO
========================================================= */

function limparFormulario() {
  dicaId.value = "";
  dicaTitulo.value = "";
  dicaResumo.value = "";
  dicaConteudo.value = "";
  dicaAtivo.checked = true;

  formTitulo.textContent = "Nova dica";

  renderizarProdutosCheckbox();
  atualizarPreviewDica();
}

if (btnNovaDica) {
  btnNovaDica.addEventListener("click", limparFormulario);
}

if (dicaForm) {
  dicaForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = dicaId.value;

    const dados = {
      titulo: dicaTitulo.value.trim(),
      resumo: dicaResumo.value.trim(),
      conteudo: dicaConteudo.value.trim(),
      ativo: dicaAtivo.checked,
      produtos_ids: pegarProdutosSelecionados(),
    };

    if (!dados.titulo || !dados.conteudo) {
      mostrarToastAdmin("Preencha título e conteúdo");
      return;
    }

    try {
      const resposta = await fetch(
        id ? `${API_DICAS_ADMIN}/${id}` : API_DICAS_ADMIN,
        {
          method: id ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dados),
        }
      );

      const resultado = await resposta.json();

      if (!resposta.ok) {
        mostrarToastAdmin(resultado.erro || "Erro ao salvar dica");
        return;
      }

      mostrarToastAdmin(id ? "Dica atualizada com sucesso" : "Dica criada com sucesso");

      limparFormulario();
      carregarDicasAdmin();

    } catch (error) {
      console.error(error);
      mostrarToastAdmin("Erro ao conectar com o servidor");
    }
  });
}

/* =========================================================
   INICIAR
========================================================= */

async function iniciarAdminDicas() {
  await carregarProdutosAdmin();
  await carregarDicasAdmin();
  atualizarPreviewDica();
}

iniciarAdminDicas();