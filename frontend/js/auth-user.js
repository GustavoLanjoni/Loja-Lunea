const API_USUARIOS = "http://localhost:3000/usuarios";

const cadastroForm = document.getElementById("cadastroForm");
const loginForm = document.getElementById("loginForm");
const toast = document.getElementById("toast");


function mostrarToast(mensagem) {
  toast.textContent = mensagem;
  toast.classList.add("active");

  setTimeout(() => {
    toast.classList.remove("active");
  }, 2500);
}

if (cadastroForm) {
  cadastroForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const senha = document.getElementById("senha").value;

    if (!nome || !email || !senha) {
      mostrarToast("Preencha nome, e-mail e senha");
      return;
    }

    if (senha.length < 6) {
      mostrarToast("A senha precisa ter pelo menos 6 caracteres");
      return;
    }

    try {
      const resposta = await fetch(`${API_USUARIOS}/cadastro`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          nome,
          email,
          telefone,
          senha
        })
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        mostrarToast(resultado.erro || "Erro ao criar conta");
        return;
      }

      mostrarToast("Conta criada com sucesso");

      setTimeout(() => {
        window.location.href = "/entrar";
      }, 1200);

    } catch (error) {
      console.error(error);
      mostrarToast("Erro ao conectar com o servidor");
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    if (!email || !senha) {
      mostrarToast("Preencha e-mail e senha");
      return;
    }

    try {
      const resposta = await fetch(`${API_USUARIOS}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          senha
        })
      });

      const resultado = await resposta.json();

      if (!resposta.ok) {
        mostrarToast(resultado.erro || "Erro ao entrar");
        return;
      }

      mostrarToast("Login realizado com sucesso");

      setTimeout(() => {
        window.location.href = "/perfil";
      }, 1200);

    } catch (error) {
      console.error(error);
      mostrarToast("Erro ao conectar com o servidor");
    }
  });
}