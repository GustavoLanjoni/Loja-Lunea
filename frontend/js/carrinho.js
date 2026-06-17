const cartItems = document.getElementById("cartItems");

async function carregarCarrinho() {

    try {

        const resposta = await fetch("/carrinho", {
            credentials: "include"
        });

        const dados = await resposta.json();

        if (!dados.itens || dados.itens.length === 0) {

            cartItems.innerHTML = `
                <div class="empty-cart">
                    <h2>Seu carrinho está vazio</h2>
                    <p>Adicione produtos para continuar.</p>
                </div>
            `;

            document.getElementById("cartCount").textContent = "0 itens";
            document.getElementById("subtotal").textContent = "R$ 0,00";
            document.getElementById("total").textContent = "R$ 0,00";

            return;
        }

        document.getElementById("cartCount").textContent =
            dados.itens.length + " itens";

        document.getElementById("subtotal").textContent =
            formatarPreco(dados.total);

        document.getElementById("total").textContent =
            formatarPreco(dados.total);

        cartItems.innerHTML = dados.itens.map(item => `

            <div class="cart-item">

                <img src="${item.imagem_url || ''}" alt="${item.nome}">

                <div class="cart-info">

                    <h3>${item.nome}</h3>

                    <div class="cart-price">
                        ${formatarPreco(item.preco_unitario)}
                    </div>

                    <div class="quantidade-box">

                        <button onclick="diminuirQuantidade(${item.produto_id}, ${item.quantidade})">
                            -
                        </button>

                        <span>${item.quantidade}</span>

                        <button onclick="aumentarQuantidade(${item.produto_id}, ${item.quantidade})">
                            +
                        </button>

                        <button class="btn-remover"
                                onclick="removerItem(${item.produto_id})">

                            <i data-lucide="trash-2"></i>

                        </button>

                    </div>

                </div>

            </div>

        `).join("");

        lucide.createIcons();

    } catch (erro) {

        cartItems.innerHTML = `
            <div class="empty-cart">
                Erro ao carregar carrinho.
            </div>
        `;
    }
}

function formatarPreco(valor) {
    return "R$ " + Number(valor).toFixed(2).replace(".", ",");
}

async function aumentarQuantidade(produtoId, quantidadeAtual) {

    await fetch(`/carrinho/itens/${produtoId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            quantidade: quantidadeAtual + 1
        })
    });

    carregarCarrinho();
}

async function diminuirQuantidade(produtoId, quantidadeAtual) {

    if (quantidadeAtual <= 1) {
        removerItem(produtoId);
        return;
    }

    await fetch(`/carrinho/itens/${produtoId}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            quantidade: quantidadeAtual - 1
        })
    });

    carregarCarrinho();
}

async function removerItem(produtoId) {

    await fetch(`/carrinho/itens/${produtoId}`, {
        method: "DELETE",
        credentials: "include"
    });

    carregarCarrinho();
}

carregarCarrinho();