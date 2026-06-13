const API_DESTAQUE_ADMIN = "http://localhost:3000/destaque";
const API_PRODUTOS_ADMIN = "http://localhost:3000/produtos";

const destaqueForm = document.getElementById("destaqueForm");

const destaqueAdminTitulo = document.getElementById("destaqueAdminTitulo");
const destaqueAdminTexto = document.getElementById("destaqueAdminTexto");
const destaqueAdminImagem = document.getElementById("destaqueAdminImagem");
const destaqueAdminProduto = document.getElementById("destaqueAdminProduto");
const destaqueAdminBotaoTexto = document.getElementById("destaqueAdminBotaoTexto");
const destaqueAdminBotaoLink = document.getElementById("destaqueAdminBotaoLink");
const destaqueAdminAtivo = document.getElementById("destaqueAdminAtivo");

const previewDestaqueImagem = document.getElementById("previewDestaqueImagem");
const previewDestaqueTitulo = document.getElementById("previewDestaqueTitulo");
const previewDestaqueTexto = document.getElementById("previewDestaqueTexto");
const previewDestaqueBotao = document.getElementById("previewDestaqueBotao");

let imagemAtualUrl = "";
let produtoAtualId = "";
let produtosAdmin = [];

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
   PEGAR IMAGEM PRINCIPAL DO PRODUTO
========================================================= */

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

  return produto.imagem || "";
}

/* =========================================================
   CARREGAR PRODUTOS NO SELECT
========================================================= */

async function carregarProdutosSelect() {
  if (!destaqueAdminProduto) return;

  try {
    const resposta = await fetch(API_PRODUTOS_ADMIN);
    const produtos = await resposta.json();

    if (!resposta.ok) {
      destaqueAdminProduto.innerHTML = `
        <option value="">Erro ao carregar produtos</option>
      `;
      return;
    }

    produtosAdmin = produtos.filter((produto) => produto.ativo);

    destaqueAdminProduto.innerHTML = `
      <option value="">Selecione um produto</option>
    `;

    produtosAdmin.forEach((produto) => {
      const option = document.createElement("option");
      option.value = produto.id;
      option.textContent = produto.nome;

      destaqueAdminProduto.appendChild(option);
    });

    if (produtoAtualId) {
      destaqueAdminProduto.value = produtoAtualId;
    }

  } catch (error) {
    console.error(error);

    destaqueAdminProduto.innerHTML = `
      <option value="">Erro ao conectar com servidor</option>
    `;
  }
}

/* =========================================================
   CARREGAR DESTAQUE SALVO
========================================================= */

async function carregarDestaqueAdmin() {
  if (!destaqueForm) return;

  try {
    const resposta = await fetch(`${API_DESTAQUE_ADMIN}/admin`);
    const destaque = await resposta.json();

    if (!resposta.ok) {
      mostrarToastAdmin("Erro ao carregar destaque");
      return;
    }

    destaqueAdminTitulo.value = destaque.titulo || "";
    destaqueAdminTexto.value = destaque.texto || "";
    destaqueAdminBotaoTexto.value = destaque.botao_texto || "Ver produto";
    destaqueAdminBotaoLink.value = destaque.botao_link || "#produtos";
    destaqueAdminAtivo.checked = destaque.ativo;

    imagemAtualUrl = destaque.imagem_url || "";
    produtoAtualId = destaque.produto_id ? String(destaque.produto_id) : "";

    await carregarProdutosSelect();

    if (destaqueAdminProduto) {
      destaqueAdminProduto.value = produtoAtualId;
    }

    atualizarPreviewDestaque();

  } catch (error) {
    console.error(error);
    mostrarToastAdmin("Erro ao conectar com o servidor");
  }
}

/* =========================================================
   PUXAR DADOS DO PRODUTO SELECIONADO
========================================================= */

function preencherComProdutoSelecionado() {
  const produtoId = destaqueAdminProduto.value;

  if (!produtoId) {
    destaqueAdminBotaoLink.value = "#produtos";
    return;
  }

  const produto = produtosAdmin.find((item) => {
    return Number(item.id) === Number(produtoId);
  });

  if (!produto) return;

  const imagemProduto = pegarImagemProduto(produto);

  destaqueAdminTitulo.value = produto.nome || "";
  destaqueAdminTexto.value = produto.descricao || "Produto selecionado da Lunea.";
  destaqueAdminBotaoTexto.value = "Ver produto";
  destaqueAdminBotaoLink.value = `/produto?id=${produto.id}`;

  if (imagemProduto) {
    imagemAtualUrl = imagemProduto;
  }

  atualizarPreviewDestaque();

  mostrarToastAdmin("Dados do produto puxados automaticamente");
}

/* =========================================================
   PREVIEW
========================================================= */

function atualizarPreviewDestaque() {
  if (!previewDestaqueImagem) return;

  const arquivo = destaqueAdminImagem.files[0];

  if (arquivo) {
    previewDestaqueImagem.src = URL.createObjectURL(arquivo);
  } else {
    previewDestaqueImagem.src =
      imagemAtualUrl || "https://via.placeholder.com/700x500";
  }

  previewDestaqueTitulo.textContent =
    destaqueAdminTitulo.value.trim() || "Título do destaque";

  previewDestaqueTexto.textContent =
    destaqueAdminTexto.value.trim() || "Texto do destaque aparecerá aqui.";

  previewDestaqueBotao.textContent =
    destaqueAdminBotaoTexto.value.trim() || "Ver produto";
}

/* =========================================================
   EVENTOS DO FORM
========================================================= */

[
  destaqueAdminTitulo,
  destaqueAdminTexto,
  destaqueAdminBotaoTexto,
].forEach((input) => {
  if (input) {
    input.addEventListener("input", atualizarPreviewDestaque);
  }
});

if (destaqueAdminImagem) {
  destaqueAdminImagem.addEventListener("change", atualizarPreviewDestaque);
}

if (destaqueAdminProduto) {
  destaqueAdminProduto.addEventListener("change", preencherComProdutoSelecionado);
}

/* =========================================================
   SALVAR DESTAQUE
========================================================= */

if (destaqueForm) {
  destaqueForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const titulo = destaqueAdminTitulo.value.trim();
    const texto = destaqueAdminTexto.value.trim();
    const produtoId = destaqueAdminProduto.value;

    if (!titulo || !texto) {
      mostrarToastAdmin("Preencha título e texto");
      return;
    }

    if (!produtoId) {
      mostrarToastAdmin("Selecione o produto do destaque");
      return;
    }

    if (!destaqueAdminImagem.files[0] && !imagemAtualUrl) {
      mostrarToastAdmin("Selecione um produto com imagem ou envie uma imagem");
      return;
    }

    const formData = new FormData();

    formData.append("titulo", titulo);
    formData.append("texto", texto);
    formData.append("botao_texto", destaqueAdminBotaoTexto.value.trim() || "Ver produto");
    formData.append("botao_link", `/produto?id=${produtoId}`);
    formData.append("produto_id", produtoId);
    formData.append("ativo", destaqueAdminAtivo.checked ? "true" : "false");
    formData.append("imagem_url", imagemAtualUrl);

    if (destaqueAdminImagem.files[0]) {
      formData.append("imagem", destaqueAdminImagem.files[0]);
    }

    try {
      const resposta = await fetch(API_DESTAQUE_ADMIN, {
        method: "PUT",
        body: formData,
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        mostrarToastAdmin(resultado.erro || "Erro ao salvar destaque");
        return;
      }

      imagemAtualUrl = resultado.destaque.imagem_url;
      produtoAtualId = resultado.destaque.produto_id
        ? String(resultado.destaque.produto_id)
        : "";

      destaqueAdminImagem.value = "";

      mostrarToastAdmin("Destaque atualizado com sucesso");
      atualizarPreviewDestaque();

    } catch (error) {
      console.error(error);
      mostrarToastAdmin("Erro ao conectar com o servidor");
    }
  });
}

/* =========================================================
   INICIAR
========================================================= */

carregarDestaqueAdmin();