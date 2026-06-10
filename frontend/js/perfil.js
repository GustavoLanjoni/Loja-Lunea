const API_USUARIOS = "http://localhost:3000/usuarios";

const perfilForm = document.getElementById("perfilForm");
const btnLogout = document.getElementById("btnLogout");
const toast = document.getElementById("toast");

const nomeUsuario = document.getElementById("nomeUsuario");
const emailUsuario = document.getElementById("emailUsuario");

const nome = document.getElementById("nome");
const email = document.getElementById("email");
const telefone = document.getElementById("telefone");


cep.addEventListener("blur", buscarEnderecoPorCep);

async function buscarEnderecoPorCep() {
  const cepDigitado = cep.value.replace(/\D/g, "");

  if (cepDigitado.length !== 8) {
    mostrarToast("Digite um CEP válido");
    return;
  }

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cepDigitado}/json/`);
    const dados = await resposta.json();

    if (dados.erro) {
      mostrarToast("CEP não encontrado");
      return;
    }

    rua.value = dados.logradouro || "";
    bairro.value = dados.bairro || "";
    cidade.value = dados.localidade || "";
    estado.value = dados.uf || "";

    mostrarToast("Endereço preenchido automaticamente");
  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao buscar CEP");
  }
}

function mostrarToast(mensagem) {
  toast.textContent = mensagem;
  toast.classList.add("active");

  setTimeout(() => {
    toast.classList.remove("active");
  }, 2500);
}

async function carregarPerfil() {
  try {
    const resposta = await fetch(`${API_USUARIOS}/perfil`, {
      credentials: "include"
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

  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao carregar perfil");
  }
}

perfilForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const resposta = await fetch(`${API_USUARIOS}/perfil`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        nome: nome.value.trim(),
        telefone: telefone.value.trim()
      })
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

btnLogout.addEventListener("click", async () => {
  try {
    await fetch(`${API_USUARIOS}/logout`, {
      method: "POST",
      credentials: "include"
    });

    window.location.href = "/entrar";

  } catch (error) {
    console.error(error);
    mostrarToast("Erro ao sair da conta");
  }
});

carregarPerfil();