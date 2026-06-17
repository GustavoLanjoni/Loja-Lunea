let carrinhosDados = [];

/* ---- TOAST ---- */
function toast(msg, tipo = "") {
  const el = document.getElementById("toastAdmin");
  el.textContent = msg;
  el.className = "toast-admin active" + (tipo ? " " + tipo : "");
  setTimeout(() => el.classList.remove("active"), 3000);
}

/* ---- HELPERS ---- */
function formatarPreco(valor) {
  return "R$ " + Number(valor || 0).toFixed(2).replace(".", ",");
}

function formatarTempo(minutos) {
  const m = Math.round(minutos);
  if (m < 60) return `${m} min atrás`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return `${h}h${rm > 0 ? rm + "min" : ""} atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function inicialLetra(nome) {
  return String(nome || "?")[0].toUpperCase();
}

/* ---- CARREGAR DADOS DA API ---- */
async function carregarCarrinhos() {
  document.getElementById("listaCarrinhos").innerHTML = `
      <div class="estado-pagina">
        <div class="spinner"></div>
        <p>Carregando carrinhos...</p>
      </div>
    `;

  try {
    const resposta = await fetch("/carrinho/admin/abandonados", {
      credentials: "include"
    });

    if (!resposta.ok) throw new Error("Erro ao buscar dados");

    carrinhosDados = await resposta.json();

    atualizarResumo();
    renderizarCarrinhos(carrinhosDados);
  } catch (e) {
    console.error(e);
    document.getElementById("listaCarrinhos").innerHTML = `
        <div class="estado-pagina">
          <i data-lucide="wifi-off"></i>
          <h3>Erro ao carregar</h3>
          <p>Verifique se o servidor está rodando.</p>
        </div>
      `;
    lucide.createIcons();
  }
}

/* ---- RESUMO ---- */
function atualizarResumo() {
  const total = carrinhosDados.length;
  const valor = carrinhosDados.reduce((s, c) => s + Number(c.valor_total || 0), 0);
  const semEmail = carrinhosDados.filter((c) => !c.email_enviado).length;
  const comEmail = carrinhosDados.filter((c) => c.email_enviado).length;

  document.getElementById("resumoTotal").textContent = total;
  document.getElementById("resumoValor").textContent = formatarPreco(valor);
  document.getElementById("resumoSemEmail").textContent = semEmail;
  document.getElementById("resumoComEmail").textContent = comEmail;
}

/* ---- FILTRAR ---- */
function filtrarCarrinhos() {
  const termo = document.getElementById("filtroBusca").value.toLowerCase();
  const emailFiltro = document.getElementById("filtroEmail").value;

  const filtrados = carrinhosDados.filter((c) => {
    const nome = String(c.usuario_nome || "").toLowerCase();
    const email = String(c.usuario_email || "").toLowerCase();
    const buscaOk = !termo || nome.includes(termo) || email.includes(termo);

    const emailOk =
      !emailFiltro ||
      (emailFiltro === "nao" && !c.email_enviado) ||
      (emailFiltro === "sim" && c.email_enviado);

    return buscaOk && emailOk;
  });

  renderizarCarrinhos(filtrados);
}

/* ---- RENDERIZAR LISTA ---- */
function renderizarCarrinhos(lista) {
  const container = document.getElementById("listaCarrinhos");

  if (lista.length === 0) {
    container.innerHTML = `
        <div class="estado-pagina">
          <i data-lucide="inbox"></i>
          <h3>Nenhum carrinho encontrado</h3>
          <p>Quando houver carrinhos abandonados, eles aparecerão aqui.</p>
        </div>
      `;
    lucide.createIcons();
    return;
  }

  container.innerHTML = `<div class="carrinhos-lista" id="carrinhosLista"></div>`;
  const listaEl = document.getElementById("carrinhosLista");

  lista.forEach((c) => {
    const card = document.createElement("div");
    card.className = "carrinho-card";
    card.dataset.id = c.carrinho_id;

    const badgeEmail = c.email_enviado
      ? `<span class="badge badge-success">
            <i data-lucide="check"></i> Email enviado
           </span>`
      : `<span class="badge badge-warn">
            <i data-lucide="clock"></i> Aguardando
           </span>`;

    const itensPreview = (c.itens || [])
      .map((item) => `
          <div class="detalhe-item">
            ${item.imagem_url
          ? `<img src="${item.imagem_url}" alt="${item.nome}">`
          : `<div class="img-placeholder"><i data-lucide="image"></i></div>`
        }
            <div class="item-info">
              <strong>${item.nome}</strong>
              <span>Qtd: ${item.quantidade}</span>
            </div>
            <div class="item-preco">
              ${formatarPreco(Number(item.preco_unitario) * item.quantidade)}
            </div>
          </div>
        `)
      .join("");

    card.innerHTML = `
        <div class="carrinho-card-header" onclick="toggleDetalhe(${c.carrinho_id})">

          <div class="carrinho-usuario">
            <div class="avatar">${inicialLetra(c.usuario_nome)}</div>
            <div class="usuario-info">
              <strong>${c.usuario_nome}</strong>
              <span>${c.usuario_email}</span>
            </div>
          </div>

          <div class="carrinho-meta">
            <div class="meta-item">
              <span class="meta-label">Itens</span>
              <span class="meta-valor">${c.total_itens}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Total</span>
              <span class="meta-valor">${formatarPreco(c.valor_total)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Abandono</span>
              <span class="meta-valor">${formatarTempo(c.minutos_abandonado)}</span>
            </div>
          </div>

          <div class="carrinho-acoes">
            ${badgeEmail}

            <button
              class="btn-email"
              onclick="event.stopPropagation(); enviarEmail(${c.carrinho_id}, this)"
              ${c.email_enviado ? 'disabled title="Email já enviado"' : ""}
            >
              <i data-lucide="mail"></i>
              ${c.email_enviado ? "Enviado" : "Enviar email"}
            </button>

            <button class="btn-expandir" id="btn-exp-${c.carrinho_id}">
              <i data-lucide="chevron-down"></i>
            </button>
          </div>

        </div>

        <div class="carrinho-detalhes" id="det-${c.carrinho_id}">
          <div class="detalhes-itens">
            ${itensPreview}
          </div>
          <div class="detalhes-rodape">
            <span class="tempo-abandono">
              Último acesso: ${new Date(c.ultimo_acesso).toLocaleString("pt-BR")}
            </span>
            <span class="total-carrinho">
              Total: ${formatarPreco(c.valor_total)}
            </span>
          </div>
        </div>
      `;

    listaEl.appendChild(card);
  });

  lucide.createIcons();
}

/* ---- EXPANDIR / RECOLHER ---- */
function toggleDetalhe(id) {
  const det = document.getElementById(`det-${id}`);
  const btn = document.getElementById(`btn-exp-${id}`);
  if (!det) return;
  det.classList.toggle("aberto");
  btn.classList.toggle("aberto");
}

/* ---- ENVIAR EMAIL ---- */
async function enviarEmail(carrinhoId, botao) {
  botao.disabled = true;
  botao.innerHTML = `<i data-lucide="loader"></i> Enviando...`;
  lucide.createIcons();

  try {
    const resposta = await fetch(`/carrinho/admin/email/${carrinhoId}`, {
      method: "POST",
      credentials: "include",
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      toast("Erro ao enviar email: " + (dados.erro || ""), "erro");
      botao.disabled = false;
      botao.innerHTML = `<i data-lucide="mail"></i> Enviar email`;
      lucide.createIcons();
      return;
    }

    toast(`Email enviado para ${dados.email} ✓`);

    // Atualiza o card localmente
    botao.innerHTML = `<i data-lucide="check"></i> Enviado`;
    botao.disabled = true;

    // Atualiza badge
    const card = document.querySelector(`[data-id="${carrinhoId}"]`);
    if (card) {
      const badge = card.querySelector(".badge");
      if (badge) {
        badge.className = "badge badge-success";
        badge.innerHTML = `<i data-lucide="check"></i> Email enviado`;
      }
    }

    // Atualiza dados locais
    const item = carrinhosDados.find((c) => c.carrinho_id === carrinhoId);
    if (item) item.email_enviado = true;

    atualizarResumo();
    lucide.createIcons();
  } catch (e) {
    console.error(e);
    toast("Erro de conexão", "erro");
    botao.disabled = false;
    botao.innerHTML = `<i data-lucide="mail"></i> Enviar email`;
    lucide.createIcons();
  }
}

/* ---- INIT ---- */
lucide.createIcons();
carregarCarrinhos();

// Atualiza automaticamente a cada 2 minutos
setInterval(carregarCarrinhos, 120000);