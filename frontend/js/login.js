lucide.createIcons();

    const emailInput  = document.getElementById("email");
    const senhaInput  = document.getElementById("senha");
    const btnLogin    = document.getElementById("btnLogin");
    const erroLogin   = document.getElementById("erroLogin");
    const erroTexto   = document.getElementById("erroTexto");
    const toggleSenha = document.getElementById("toggleSenha");

    // ---- Toggle mostrar/ocultar senha ----
    toggleSenha.addEventListener("click", () => {
      const visivel = senhaInput.type === "text";
      senhaInput.type = visivel ? "password" : "text";
      document.getElementById("iconeSenha").setAttribute(
        "data-lucide", visivel ? "eye" : "eye-off"
      );
      lucide.createIcons();
    });

    // ---- Mostrar erro ----
    function mostrarErro(mensagem) {
      erroTexto.textContent = mensagem;
      erroLogin.classList.add("ativo");
    }

    function esconderErro() {
      erroLogin.classList.remove("ativo");
    }

    // ---- Verificar se já está logado ao carregar ----
    async function verificarSessaoAtual() {
      try {
        const resposta = await fetch("/usuarios/sessao", {
          credentials: "include",
        });

        if (resposta.ok) {
          const dados = await resposta.json();
          // Se já está logado, redireciona direto
          redirecionarPorCargo(dados.usuario.cargo);
        }
      } catch (e) {
        // Não está logado, continua na página normalmente
      }
    }

    // ---- Redirecionar conforme cargo ----
    function redirecionarPorCargo(cargo) {
      if (cargo === "admin") {
        window.location.href = "/admin";
      } else {
        // Verifica se veio de alguma página específica
        const origem = new URLSearchParams(window.location.search).get("redirect");
        window.location.href = origem || "/";
      }
    }

    // ---- Login ----
    async function fazerLogin() {
      const email = emailInput.value.trim();
      const senha = senhaInput.value;

      esconderErro();

      if (!email || !senha) {
        mostrarErro("Preencha e-mail e senha.");
        return;
      }

      // Loading
      btnLogin.classList.add("loading");
      btnLogin.disabled = true;

      try {
        const resposta = await fetch("/usuarios/login", {
          method:      "POST",
          credentials: "include",
          headers:     { "Content-Type": "application/json" },
          body:        JSON.stringify({ email, senha }),
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
          mostrarErro(dados.erro || "E-mail ou senha incorretos.");
          return;
        }

        // ✅ Redireciona conforme o cargo retornado
        redirecionarPorCargo(dados.usuario.cargo);

      } catch (e) {
        mostrarErro("Erro de conexão. Tente novamente.");
      } finally {
        btnLogin.classList.remove("loading");
        btnLogin.disabled = false;
      }
    }

    // Eventos
    btnLogin.addEventListener("click", fazerLogin);

    senhaInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") fazerLogin();
    });

    emailInput.addEventListener("input", esconderErro);
    senhaInput.addEventListener("input", esconderErro);

    // Verifica sessão ao carregar
    verificarSessaoAtual();