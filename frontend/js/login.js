const loginForm = document.getElementById("loginForm");
const email = document.getElementById("email");
const senha = document.getElementById("senha");
const toast = document.getElementById("toast");

const ADMIN_EMAIL = "admin@lunea.com";
const ADMIN_SENHA = "123456";

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (email.value === ADMIN_EMAIL && senha.value === ADMIN_SENHA) {
    localStorage.setItem("lunea_admin_logado", "true");
    window.location.href = "/admin";
  } else {
    mostrarToast("E-mail ou senha incorretos");
  }
});

function mostrarToast(mensagem) {
  toast.textContent = mensagem;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}