const API_USUARIOS = "http://localhost:3000/usuarios";
const API_FAVORITOS = "http://localhost:3000/favoritos";

const perfilForm = document.getElementById("perfilForm");
const btnLogout = document.getElementById("btnLogout");
const toast = document.getElementById("toast");

const nomeUsuario = document.getElementById("nomeUsuario");
const emailUsuario = document.getElementById("emailUsuario");

const nome = document.getElementById("nome");
const email = document.getElementById("email");
const telefone = document.getElementById("telefone");

const cep = document.getElementById("cep");
const rua = document.getElementById("rua");
const numero = document.getElementById("numero");
const bairro = document.getElementById("bairro");
const cidade = document.getElementById("cidade");
const estado = document.getElementById("estado");

const listaFavoritos = document.getElementById("listaFavoritos");

function mostrarToast(mensagem) {
  toast.textContent = mensagem;
  toast.classList.add("active");

  setTimeout(() => {
    toast.classList.remove("active");
  }, 2500);
}

/* =========================================================
   CARREGAR PERFIL
========================================================= */

async function carregarPerfil() {
  try {
    const resposta = await fetch(`${API_USUARIOS}/perfil`, {
      credentials: "include",
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      window.location.href = "/entrar";
      return;
    }

    const usuario = resultado.usuario;

    nomeUsuario.textContent = usuario.nome;
    emailUsuario.textContent = usuario.email;

    nome.value = usuario.nome || "";
    email.value = usuario.email || "";
    telefone.value = usuario.telefone || "";

    cep.value = usuario.cep || "";
    rua.value = usuario.rua || "";
    numero.value = usuario.numero || "";
    bairro.value = usuario.bairro || "";
    cidade.value = usuario.cidade || "";
    estado.value = usuario.estado || "";

  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao carregar perfil");
  }
}

/* =========================================================
   ATUALIZAR PERFIL
========================================================= */

if (perfilForm) {
  perfilForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const resposta = await fetch(`${API_USUARIOS}/perfil`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          nome: nome.value.trim(),
          telefone: telefone.value.trim(),
          cep: cep.value.trim(),
          rua: rua.value.trim(),
          numero: numero.value.trim(),
          bairro: bairro.value.trim(),
          cidade: cidade.value.trim(),
          estado: estado.value.trim(),
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        mostrarToast(resultado.erro || "Erro ao atualizar perfil");
        return;
      }

      nomeUsuario.textContent = resultado.usuario.nome;
      mostrarToast("Perfil atualizado com sucesso");

    } catch (error) {
      console.error(error);
      mostrarToast("Erro ao conectar com o servidor");
    }
  });
}

/* =========================================================
   CEP AUTOMÁTICO
========================================================= */

if (cep) {
  cep.addEventListener("input", () => {
    cep.value = cep.value
      .replace(/\D/g, "")
      .replace(/^(\d{5})(\d)/, "$1-$2")
      .slice(0, 9);
  });

  cep.addEventListener("blur", buscarEnderecoPorCep);
}

async function buscarEnderecoPorCep() {
  const cepDigitado = cep.value.replace(/\D/g, "");

  if (!cepDigitado) return;

  if (cepDigitado.length !== 8) {
    mostrarToast("Digite um CEP válido");
    return;
  }

  try {
    rua.value = "Buscando endereço...";
    bairro.value = "";
    cidade.value = "";
    estado.value = "";

    const resposta = await fetch(`https://viacep.com.br/ws/${cepDigitado}/json/`);
    const dados = await resposta.json();

    if (dados.erro) {
      rua.value = "";
      mostrarToast("CEP não encontrado");
      return;
    }

    rua.value = dados.logradouro || "";
    bairro.value = dados.bairro || "";
    cidade.value = dados.localidade || "";
    estado.value = dados.uf || "";

    numero.focus();

    mostrarToast("Endereço preenchido automaticamente");

  } catch (error) {
    console.error(error);
    rua.value = "";
    mostrarToast("Erro ao buscar CEP");
  }
}

/* =========================================================
   FAVORITOS
========================================================= */

async function carregarFavoritos() {
  if (!listaFavoritos) return;

  try {
    const resposta = await fetch(API_FAVORITOS, {
      credentials: "include",
    });

    const favoritos = await resposta.json();

    if (!resposta.ok) {
      listaFavoritos.innerHTML = `
        <div class="empty-favorites">
          Não foi possível carregar seus favoritos.
        </div>
      `;
      return;
    }

    renderizarFavoritos(favoritos);

  } catch (error) {
    console.error(error);

    listaFavoritos.innerHTML = `
      <div class="empty-favorites">
        Erro ao carregar favoritos.
      </div>
    `;
  }
}

function renderizarFavoritos(favoritos) {
  listaFavoritos.innerHTML = "";

  if (!favoritos || favoritos.length === 0) {
    listaFavoritos.innerHTML = `
      <div class="empty-favorites">
        Nenhum produto favorito ainda.
      </div>
    `;
    return;
  }

  favoritos.forEach((favorito) => {
    const produto = favorito.produtos;

    if (!produto) return;

    const imagens =
      produto.produto_imagens ||
      produto.imagens ||
      [];

    const imagemPrincipal =
      imagens.length > 0
        ? imagemPrincipalOrdenada(imagens)
        : produto.imagem || "https://via.placeholder.com/300x300";

    const item = document.createElement("div");
    item.className = "favorite-item";

    item.innerHTML = `
      <img src="${imagemPrincipal}" alt="${produto.nome}">

      <div class="favorite-info">
        <h3>${produto.nome}</h3>
        <p>${produto.descricao || "Produto Lunea"}</p>
        <strong>R$ ${Number(produto.preco).toFixed(2).replace(".", ",")}</strong>
      </div>

      <div class="favorite-actions">
        <button 
          type="button"
          title="Ver produto"
          onclick="abrirProduto(${produto.id})"
        >
          <i data-lucide="eye"></i>
        </button>

        <button 
          type="button"
          class="remove-favorite"
          title="Remover favorito"
          onclick="removerFavorito(${produto.id})"
        >
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;

    listaFavoritos.appendChild(item);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

function imagemPrincipalOrdenada(imagens) {
  const imagensOrdenadas = [...imagens].sort((a, b) => {
    return Number(a.ordem || 0) - Number(b.ordem || 0);
  });

  return imagensOrdenadas[0].imagem_url;
}

function abrirProduto(produtoId) {
  window.location.href = `/produto?id=${produtoId}`;
}

async function removerFavorito(produtoId) {
  try {
    const resposta = await fetch(`${API_FAVORITOS}/${produtoId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!resposta.ok) {
      mostrarToast("Erro ao remover favorito");
      return;
    }

    mostrarToast("Produto removido dos favoritos");
    carregarFavoritos();

  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao conectar com o servidor");
  }
}

/* =========================================================
   LOGOUT
========================================================= */

if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    try {
      await fetch(`${API_USUARIOS}/logout`, {
        method: "POST",
        credentials: "include",
      });

      window.location.href = "/entrar";

    } catch (error) {
      console.error(error);
      mostrarToast("Erro ao sair da conta");
    }
  });
}

/* =========================================================
   INICIAR PERFIL
========================================================= */

carregarPerfil();
carregarFavoritos();