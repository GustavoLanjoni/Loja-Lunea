const API_URL = "http://localhost:3000/produtos";

const productsGrid = document.getElementById("productsGrid");
const buscarProduto = document.getElementById("buscarProduto");
const ordenacao = document.getElementById("ordenacao");

let produtos = [];

function formatarPreco(valor) {
    return Number(valor).toFixed(2).replace(".", ",");
}

function pegarImagemProduto(produto) {

    if (
        produto.imagens &&
        produto.imagens.length > 0
    ) {
        return produto.imagens[0].imagem_url;
    }

    return "/assets/img/sem-imagem.png";
}

function renderizar(lista) {

    productsGrid.innerHTML = "";

    lista.forEach(produto => {

        productsGrid.innerHTML += `
        <div class="product-card">

            <div class="product-image-box">
                <img src="${pegarImagemProduto(produto)}">
            </div>

            <div class="product-info">
                <h3>${produto.nome}</h3>

                <div class="product-price">
                    R$ ${formatarPreco(produto.preco)}
                </div>

                <a href="/produto?id=${produto.id}">
                    Ver produto
                </a>
            </div>

        </div>
        `;
    });
}

async function carregarProdutos() {

    const resposta = await fetch(API_URL);

    produtos = await resposta.json();

    renderizar(produtos);
}

buscarProduto.addEventListener("input", () => {

    const termo = buscarProduto.value.toLowerCase();

    const filtrados = produtos.filter(produto =>
        produto.nome.toLowerCase().includes(termo)
    );

    renderizar(filtrados);
});

ordenacao.addEventListener("change", () => {

    let lista = [...produtos];

    if (ordenacao.value === "menor-preco") {
        lista.sort((a,b)=>a.preco-b.preco);
    }

    if (ordenacao.value === "maior-preco") {
        lista.sort((a,b)=>b.preco-a.preco);
    }

    if (ordenacao.value === "recentes") {
        lista.sort((a,b)=>b.id-a.id);
    }

    renderizar(lista);
});

carregarProdutos();