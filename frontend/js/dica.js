const API_DICAS = "http://localhost:3000/dicas";

const dicaTitulo = document.getElementById("dicaTitulo");
const dicaResumo = document.getElementById("dicaResumo");
const dicaConteudo = document.getElementById("dicaConteudo");
const dicaProdutosGrid = document.getElementById("dicaProdutosGrid");
const toast = document.getElementById("toast");

function pegarDicaId() {
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

function formatarPreco(valor) {
  return Number(valor || 0).toFixed(2).replace(".", ",");
}

function pegarImagemProduto(produto) {
  if (produto.produto_imagens && produto.produto_imagens.length > 0) {
    const imagensOrdenadas = [...produto.produto_imagens].sort((a, b) => {
      return Number(a.ordem || 0) - Number(b.ordem || 0);
    });

    return imagensOrdenadas[0].imagem_url;
  }

  if (produto.imagens && produto.imagens.length > 0) {
    const imagensOrdenadas = [...produto.imagens].sort((a, b) => {
      return Number(a.ordem || 0) - Number(b.ordem || 0);
    });

    return imagensOrdenadas[0].imagem_url;
  }

  return produto.imagem || "https://via.placeholder.com/400x400";
}

async function carregarDica() {
  const id = pegarDicaId();

  if (!id) {
    dicaTitulo.textContent = "Dica não encontrada";
    dicaResumo.textContent = "Volte para a loja e escolha uma dica.";
    dicaConteudo.textContent = "";
    dicaProdutosGrid.innerHTML = "";
    return;
  }

  try {
    const resposta = await fetch(`${API_DICAS}/${id}`);
    const resultado = await resposta.json();

    if (!resposta.ok) {
      dicaTitulo.textContent = "Dica não encontrada";
      dicaResumo.textContent = resultado.erro || "Essa dica não existe ou foi removida.";
      dicaConteudo.textContent = "";
      dicaProdutosGrid.innerHTML = "";
      return;
    }

    const dica = resultado.dica;

    document.title = `${dica.titulo} | Lunea`;

    dicaTitulo.textContent = dica.titulo;
    dicaResumo.textContent = dica.resumo || "Conteúdo especial da Lunea.";
    dicaConteudo.textContent = dica.conteudo || "";

    renderizarProdutos(resultado.produtos || []);

  } catch (error) {
    console.error(error);

    dicaTitulo.textContent = "Erro ao carregar dica";
    dicaResumo.textContent = "Não foi possível carregar esse conteúdo agora.";
    dicaConteudo.textContent = "";
  }
}

function renderizarProdutos(lista) {
  dicaProdutosGrid.innerHTML = "";

  if (!lista || lista.length === 0) {
    dicaProdutosGrid.innerHTML = `
      <div class="empty-products">
        Nenhum produto recomendado para essa dica ainda.
      </div>
    `;
    return;
  }

  lista.forEach((item) => {
    const produto = item.produtos;

    if (!produto || produto.ativo === false) return;

    const imagem = pegarImagemProduto(produto);

    const card = document.createElement("div");
    card.className = "tip-product-card";

    card.innerHTML = `
      <div class="tip-product-image">
        <img src="${imagem}" alt="${produto.nome}">
      </div>

      <h3>${produto.nome}</h3>

      <strong>
        R$ ${formatarPreco(produto.preco)}
      </strong>

      <button type="button">
        Ver produto
      </button>
    `;

    card.addEventListener("click", () => {
      window.location.href = `/produto?id=${produto.id}`;
    });

    const botao = card.querySelector("button");

    botao.addEventListener("click", (event) => {
      event.stopPropagation();
      window.location.href = `/produto?id=${produto.id}`;
    });

    dicaProdutosGrid.appendChild(card);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

carregarDica();