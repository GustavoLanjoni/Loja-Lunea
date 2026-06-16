// ==========================================================
// admin-guard.js — Lunea
// Incluir no <head> de TODAS as páginas admin:
//   <script src="/js/admin-guard.js"></script>
//
// O que faz:
//  1. Verifica se há sessão ativa
//  2. Verifica se o cargo é "admin"
//  3. Se não for, redireciona para o login
// ==========================================================

(async function protegerPaginaAdmin() {
  try {
    const resposta = await fetch("/usuarios/sessao", {
      credentials: "include",
    });

    // Sem sessão → vai para o login
    if (!resposta.ok) {
      window.location.replace("/entrar?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }

    const dados = await resposta.json();

    // Logado mas não é admin → volta para a loja
    if (!dados.usuario || dados.usuario.cargo !== "admin") {
      window.location.replace("/");
      return;
    }

    // ✅ É admin — exibe o conteúdo da página
    document.documentElement.classList.add("admin-autorizado");

    // Disponibiliza os dados do admin globalmente
    window.adminLogado = dados.usuario;

    // Preenche nome do admin no header se existir o elemento
    const nomeAdminEl = document.getElementById("nomeAdmin");
    if (nomeAdminEl) {
      nomeAdminEl.textContent = dados.usuario.nome;
    }

  } catch (e) {
    // Erro de rede → redireciona por segurança
    window.location.replace("/entrar");
  }
})();