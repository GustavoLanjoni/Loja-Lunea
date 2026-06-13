const API_PRODUTOS = "http://localhost:3000/produtos";

const produtoImagemPrincipal = document.getElementById("produtoImagemPrincipal");
const produtoMiniaturas = document.getElementById("produtoMiniaturas");

const produtoCategoria = document.getElementById("produtoCategoria");
const produtoNome = document.getElementById("produtoNome");
const produtoDescricao = document.getElementById("produtoDescricao");
const produtoPreco = document.getElementById("produtoPreco");

const diminuirQuantidade = document.getElementById("diminuirQuantidade");
const aumentarQuantidade = document.getElementById("aumentarQuantidade");
const quantidadeProduto = document.getElementById("quantidadeProduto");

const comprarWhatsApp = document.getElementById("comprarWhatsApp");
const toast = document.getElementById("toast");

let produtoAtual = null;
let quantidade = 1;

function mostrarToast(mensagem) {
  toast.textContent = mensagem;
  toast.classList.add("active");

  setTimeout(() => {
    toast.classList.remove("active");
  }, 2500);
}

function formatarPreco(valor) {
  return Number(valor).toFixed(2).replace(".", ",");
}

function pegarIdProduto() {
  const parametros = new URLSearchParams(window.location.search);
  return parametros.get("id");
}

async function carregarProduto() {
  const id = pegarIdProduto();

  if (!id) {
    mostrarToast("Produto não encontrado");
    return;
  }

  try {
    const resposta = await fetch(`${API_PRODUTOS}/${id}`);
    const produto = await resposta.json();

    if (!resposta.ok) {
      mostrarToast(produto.erro || "Produto não encontrado");
      return;
    }

    produtoAtual = produto;

    renderizarProduto(produto);
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao carregar produto");
  }
}

function renderizarProduto(produto) {
  document.title = `${produto.nome} | Lunea`;

  produtoCategoria.textContent = produto.categoria_nome || "Lunea";
  produtoNome.textContent = produto.nome;
  produtoDescricao.textContent = produto.descricao || "Produto Lunea";
  produtoPreco.textContent = `R$ ${formatarPreco(produto.preco)}`;

  const imagens = produto.imagens && produto.imagens.length > 0
    ? produto.imagens
    : [{ imagem_url: produto.imagem || "https://via.placeholder.com/600x600" }];

  produtoImagemPrincipal.src = imagens[0].imagem_url;
  produtoImagemPrincipal.alt = produto.nome;

  produtoMiniaturas.innerHTML = "";

  imagens.forEach((imagem, index) => {
    const img = document.createElement("img");

    img.src = imagem.imagem_url;
    img.alt = produto.nome;

    if (index === 0) {
      img.classList.add("active");
    }

    img.addEventListener("click", () => {
      produtoImagemPrincipal.src = imagem.imagem_url;

      document
        .querySelectorAll(".product-thumbnails img")
        .forEach((item) => item.classList.remove("active"));

      img.classList.add("active");
    });

    produtoMiniaturas.appendChild(img);
  });
}

diminuirQuantidade.addEventListener("click", () => {
  if (quantidade <= 1) return;

  quantidade--;
  quantidadeProduto.textContent = quantidade;
});

aumentarQuantidade.addEventListener("click", () => {
  quantidade++;
  quantidadeProduto.textContent = quantidade;
});

comprarWhatsApp.addEventListener("click", () => {
  if (!produtoAtual) return;

  const total = Number(produtoAtual.preco) * quantidade;

  const mensagem = `
Olá! Tenho interesse neste produto da Lunea:

Produto: ${produtoAtual.nome}
Quantidade: ${quantidade}
Valor unitário: R$ ${formatarPreco(produtoAtual.preco)}
Total: R$ ${formatarPreco(total)}
  `;

  const telefone = "5517996489436";
  const texto = encodeURIComponent(mensagem);

  window.open(`https://wa.me/${telefone}?text=${texto}`, "_blank");
});

carregarProduto();