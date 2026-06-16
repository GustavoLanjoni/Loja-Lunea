

import { Router, Request, Response, NextFunction } from "express";
import { Resend } from "resend";
import cron from "node-cron";
import { pool } from "../database/connection";
import { supabase } from "../database/supabase";

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

const COOKIE_NAME       = "lunea_session";
const MINUTOS_ABANDONO  = 30;

// ==========================================================
// TIPOS
// ==========================================================

interface Usuario {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  cargo: string;
  ativo: boolean;
}

interface RequestAutenticado extends Request {
  usuario: Usuario;
}

interface CarrinhoItem {
  id: number;
  produto_id: number;
  quantidade: number;
  preco_unitario: number;
  nome: string;
  estoque: number | null;
  imagem_url: string | null;
}

interface CarrinhoAbandonado {
  carrinho_id: number;
  usuario_id: number;
  usuario_nome: string;
  usuario_email: string;
  usuario_telefone: string | null;
  status: string;
  email_enviado: boolean;
  email_enviado_em: string | null;
  ultimo_acesso: string;
  criado_em: string;
  total_itens: number;
  valor_total: number;
  minutos_abandonado: number;
  itens?: CarrinhoItem[];
}

// ==========================================================
// MIDDLEWARE — autenticação (mesmo padrão do usuarios.routes.ts)
// ==========================================================

async function autenticarUsuario(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({ erro: "Login necessário para usar o carrinho" });
    }

    const agora = new Date().toISOString();

    const { data: sessao, error } = await supabase
      .from("sessoes_usuarios")
      .select(`
        id,
        token,
        ativo,
        expira_em,
        usuario_id,
        usuarios (
          id,
          nome,
          email,
          telefone,
          cargo,
          empresa_id,
          ativo,
          criado_em
        )
      `)
      .eq("token", token)
      .eq("ativo", true)
      .gt("expira_em", agora)
      .single();

    if (error || !sessao) {
      return res.status(401).json({ erro: "Sessão inválida ou expirada" });
    }

    (req as RequestAutenticado).usuario = sessao.usuarios as unknown as Usuario;

    next();
  } catch (error) {
    console.error("[autenticarUsuario]", error);
    return res.status(500).json({ erro: "Erro ao autenticar usuário" });
  }
}

// Middleware que só permite cargo "admin"
async function autenticarAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  await autenticarUsuario(req, res, async () => {
    const usuario = (req as RequestAutenticado).usuario;
    if (usuario.cargo !== "admin") {
      return res.status(403).json({ erro: "Acesso restrito a administradores" });
    }
    next();
  });
}

// ==========================================================
// HELPER — pegar ou criar carrinho ativo
// ==========================================================

async function pegarOuCriarCarrinho(usuario_id: number): Promise<number> {
  const resultado = await pool.query<{ id: number }>(
    `SELECT id FROM carrinhos
     WHERE usuario_id = $1 AND status = 'ativo'
     ORDER BY criado_em DESC
     LIMIT 1`,
    [usuario_id]
  );

  if (resultado.rows.length > 0) return resultado.rows[0].id;

  const novo = await pool.query<{ id: number }>(
    `INSERT INTO carrinhos (usuario_id) VALUES ($1) RETURNING id`,
    [usuario_id]
  );

  return novo.rows[0].id;
}

// Atualiza timestamp para não marcar como abandonado enquanto o usuário navega
async function tocarCarrinho(carrinho_id: number): Promise<void> {
  await pool.query(
    `UPDATE carrinhos SET atualizado_em = NOW() WHERE id = $1`,
    [carrinho_id]
  );
}

// ==========================================================
// GET /carrinho
// Retorna o carrinho ativo com todos os itens
// ==========================================================

router.get("/", autenticarUsuario, async (req: Request, res: Response) => {
  try {
    const usuario = (req as RequestAutenticado).usuario;
    const carrinho_id = await pegarOuCriarCarrinho(usuario.id);

    const { rows: itens } = await pool.query<CarrinhoItem>(
      `SELECT
         ci.id,
         ci.produto_id,
         ci.quantidade,
         ci.preco_unitario,
         p.nome,
         p.estoque,
         pi.imagem_url
       FROM carrinho_itens ci
       JOIN produtos p ON p.id = ci.produto_id
       LEFT JOIN produto_imagens pi
         ON pi.produto_id = p.id AND pi.ordem = 0
       WHERE ci.carrinho_id = $1
       ORDER BY ci.criado_em ASC`,
      [carrinho_id]
    );

    const total = itens.reduce(
      (soma, item) => soma + Number(item.preco_unitario) * item.quantidade,
      0
    );

    await tocarCarrinho(carrinho_id);

    return res.json({ carrinho_id, itens, total });
  } catch (error) {
    console.error("[GET /carrinho]", error);
    return res.status(500).json({ erro: "Erro ao carregar carrinho" });
  }
});

// ==========================================================
// POST /carrinho/itens
// Adiciona ou incrementa produto no carrinho
// Body: { produto_id: number, quantidade?: number }
// ==========================================================

router.post("/itens", autenticarUsuario, async (req: Request, res: Response) => {
  try {
    const usuario = (req as RequestAutenticado).usuario;
    const { produto_id, quantidade = 1 } = req.body;

    if (!produto_id) {
      return res.status(400).json({ erro: "produto_id é obrigatório" });
    }

    // Verifica produto
    const { rows: produtos } = await pool.query(
      `SELECT id, preco, estoque, ativo FROM produtos WHERE id = $1`,
      [produto_id]
    );

    if (produtos.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    const produto = produtos[0];

    if (!produto.ativo) {
      return res.status(400).json({ erro: "Produto indisponível" });
    }

    if (produto.estoque !== null && produto.estoque < quantidade) {
      return res.status(400).json({ erro: "Estoque insuficiente" });
    }

    const carrinho_id = await pegarOuCriarCarrinho(usuario.id);

    // Upsert: se já existe no carrinho, incrementa quantidade
    await pool.query(
      `INSERT INTO carrinho_itens (carrinho_id, produto_id, quantidade, preco_unitario)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (carrinho_id, produto_id)
       DO UPDATE SET
         quantidade    = carrinho_itens.quantidade + EXCLUDED.quantidade,
         atualizado_em = NOW()`,
      [carrinho_id, produto_id, quantidade, produto.preco]
    );

    await tocarCarrinho(carrinho_id);

    return res.json({ mensagem: "Produto adicionado ao carrinho" });
  } catch (error) {
    console.error("[POST /carrinho/itens]", error);
    return res.status(500).json({ erro: "Erro ao adicionar produto" });
  }
});

// ==========================================================
// PATCH /carrinho/itens/:produto_id
// Atualiza quantidade de um item específico
// Body: { quantidade: number }
// ==========================================================

router.patch("/itens/:produto_id", autenticarUsuario, async (req: Request, res: Response) => {
  try {
    const usuario    = (req as RequestAutenticado).usuario;
    const produto_id = Number(req.params.produto_id);
    const { quantidade } = req.body;

    if (!quantidade || quantidade < 1) {
      return res.status(400).json({ erro: "Quantidade inválida" });
    }

    const carrinho_id = await pegarOuCriarCarrinho(usuario.id);

    await pool.query(
      `UPDATE carrinho_itens
       SET quantidade = $1, atualizado_em = NOW()
       WHERE carrinho_id = $2 AND produto_id = $3`,
      [quantidade, carrinho_id, produto_id]
    );

    await tocarCarrinho(carrinho_id);

    return res.json({ mensagem: "Quantidade atualizada" });
  } catch (error) {
    console.error("[PATCH /carrinho/itens]", error);
    return res.status(500).json({ erro: "Erro ao atualizar item" });
  }
});

// ==========================================================
// DELETE /carrinho/itens/:produto_id
// Remove um produto específico do carrinho
// ==========================================================

router.delete("/itens/:produto_id", autenticarUsuario, async (req: Request, res: Response) => {
  try {
    const usuario    = (req as RequestAutenticado).usuario;
    const produto_id = Number(req.params.produto_id);

    const carrinho_id = await pegarOuCriarCarrinho(usuario.id);

    await pool.query(
      `DELETE FROM carrinho_itens
       WHERE carrinho_id = $1 AND produto_id = $2`,
      [carrinho_id, produto_id]
    );

    await tocarCarrinho(carrinho_id);

    return res.json({ mensagem: "Produto removido do carrinho" });
  } catch (error) {
    console.error("[DELETE /carrinho/itens]", error);
    return res.status(500).json({ erro: "Erro ao remover produto" });
  }
});

// ==========================================================
// DELETE /carrinho
// Limpa todos os itens do carrinho
// ==========================================================

router.delete("/", autenticarUsuario, async (req: Request, res: Response) => {
  try {
    const usuario     = (req as RequestAutenticado).usuario;
    const carrinho_id = await pegarOuCriarCarrinho(usuario.id);

    await pool.query(
      `DELETE FROM carrinho_itens WHERE carrinho_id = $1`,
      [carrinho_id]
    );

    await tocarCarrinho(carrinho_id);

    return res.json({ mensagem: "Carrinho limpo" });
  } catch (error) {
    console.error("[DELETE /carrinho]", error);
    return res.status(500).json({ erro: "Erro ao limpar carrinho" });
  }
});

// ==========================================================
// POST /carrinho/converter
// Chamado ao finalizar pedido — marca carrinho como convertido
// ==========================================================

router.post("/converter", autenticarUsuario, async (req: Request, res: Response) => {
  try {
    const usuario = (req as RequestAutenticado).usuario;

    await pool.query(
      `UPDATE carrinhos SET status = 'convertido'
       WHERE usuario_id = $1 AND status = 'ativo'`,
      [usuario.id]
    );

    return res.json({ mensagem: "Carrinho convertido em pedido" });
  } catch (error) {
    console.error("[POST /carrinho/converter]", error);
    return res.status(500).json({ erro: "Erro ao converter carrinho" });
  }
});

// ==========================================================
// ADMIN — GET /carrinho/admin/abandonados
// Lista todos os carrinhos abandonados com itens
// ==========================================================

router.get("/admin/abandonados", autenticarAdmin, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query<CarrinhoAbandonado>(
      `SELECT * FROM view_carrinhos_abandonados`
    );

    // Busca itens de cada carrinho
    const carrinhos = await Promise.all(
      rows.map(async (carrinho) => {
        const { rows: itens } = await pool.query<CarrinhoItem>(
          `SELECT
             ci.produto_id,
             ci.quantidade,
             ci.preco_unitario,
             p.nome,
             pi.imagem_url
           FROM carrinho_itens ci
           JOIN produtos p ON p.id = ci.produto_id
           LEFT JOIN produto_imagens pi
             ON pi.produto_id = p.id AND pi.ordem = 0
           WHERE ci.carrinho_id = $1`,
          [carrinho.carrinho_id]
        );

        return { ...carrinho, itens };
      })
    );

    return res.json(carrinhos);
  } catch (error) {
    console.error("[GET /carrinho/admin/abandonados]", error);
    return res.status(500).json({ erro: "Erro ao buscar carrinhos abandonados" });
  }
});

// ==========================================================
// ADMIN — POST /carrinho/admin/email/:carrinho_id
// Dispara email de recuperação via Resend
// ==========================================================

router.post("/admin/email/:carrinho_id", autenticarAdmin, async (req: Request, res: Response) => {
  try {
    const carrinho_id = Number(req.params.carrinho_id);

    // Busca dados do carrinho na view
    const { rows } = await pool.query<CarrinhoAbandonado>(
      `SELECT * FROM view_carrinhos_abandonados WHERE carrinho_id = $1`,
      [carrinho_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: "Carrinho não encontrado" });
    }

    const carrinho = rows[0];

    // Busca itens detalhados
    const { rows: itens } = await pool.query<CarrinhoItem>(
      `SELECT
         ci.produto_id,
         ci.quantidade,
         ci.preco_unitario,
         p.nome,
         pi.imagem_url
       FROM carrinho_itens ci
       JOIN produtos p ON p.id = ci.produto_id
       LEFT JOIN produto_imagens pi
         ON pi.produto_id = p.id AND pi.ordem = 0
       WHERE ci.carrinho_id = $1`,
      [carrinho_id]
    );

    const nomeCliente  = carrinho.usuario_nome.split(" ")[0];
    const totalFormatado = Number(carrinho.valor_total).toFixed(2).replace(".", ",");
    const urlCarrinho  = `${process.env.FRONTEND_URL}/carrinho`;

    // Monta linhas de itens do email
    const itensHtml = itens.map((item) => `
      <tr>
        <td style="padding:14px 0; border-bottom:1px solid #f0ebe5;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:14px; vertical-align:middle;">
                ${item.imagem_url
                  ? `<img src="${item.imagem_url}" width="60" height="60"
                      style="border-radius:8px; object-fit:cover; display:block;">`
                  : `<div style="width:60px;height:60px;background:#f5f0eb;border-radius:8px;"></div>`
                }
              </td>
              <td style="vertical-align:middle;">
                <strong style="color:#1a1a1a;font-size:14px;">${item.nome}</strong><br>
                <span style="color:#999;font-size:13px;">Qtd: ${item.quantidade}</span>
              </td>
            </tr>
          </table>
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #f0ebe5;
                   text-align:right;font-weight:700;color:#1a1a1a;
                   font-size:15px;vertical-align:middle;">
          R$ ${(Number(item.preco_unitario) * item.quantidade).toFixed(2).replace(".", ",")}
        </td>
      </tr>
    `).join("");

    const htmlEmail = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Seu carrinho está te esperando</title>
</head>
<body style="margin:0;padding:0;background:#f9f6f2;
             font-family:'Helvetica Neue',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f9f6f2;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background:#fff;border-radius:20px;overflow:hidden;
                 box-shadow:0 4px 24px rgba(0,0,0,0.07);max-width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:#1a1a1a;padding:36px 48px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:30px;
                         letter-spacing:0.12em;font-weight:300;">
                LUNEA
              </h1>
              <p style="color:#9b8b7a;margin:6px 0 0;font-size:12px;
                        letter-spacing:0.1em;text-transform:uppercase;">
                by Skin
              </p>
            </td>
          </tr>

          <!-- CORPO -->
          <tr>
            <td style="padding:40px 48px 0;">

              <h2 style="color:#1a1a1a;font-size:22px;margin:0 0 12px;
                         font-weight:700;line-height:1.3;">
                Você esqueceu algo especial, ${nomeCliente} 🌙
              </h2>

              <p style="color:#666;font-size:15px;line-height:1.7;margin:0 0 32px;">
                Notamos que você deixou alguns produtos no seu carrinho da Lunea.
                Eles ainda estão guardados para você — mas o estoque é limitado!
              </p>

              <!-- ITENS -->
              <table width="100%" cellpadding="0" cellspacing="0">
                ${itensHtml}
              </table>

              <!-- TOTAL -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="margin-top:20px;background:#f9f6f2;
                       border-radius:12px;padding:18px 22px;">
                <tr>
                  <td style="color:#888;font-size:14px;">
                    Total do carrinho
                  </td>
                  <td style="text-align:right;font-size:22px;
                             font-weight:700;color:#1a1a1a;">
                    R$ ${totalFormatado}
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="margin:36px 0;">
                <tr>
                  <td align="center">
                    <a href="${urlCarrinho}"
                      style="display:inline-block;background:#1a1a1a;
                             color:#fff;text-decoration:none;
                             padding:17px 52px;border-radius:100px;
                             font-size:15px;font-weight:600;
                             letter-spacing:0.04em;">
                      Finalizar minha compra →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#bbb;font-size:13px;text-align:center;
                        line-height:1.6;margin:0 0 36px;">
                Ficou com dúvida? Chame a gente no
                <a href="https://wa.me/5517996489436"
                  style="color:#9b8b7a;text-decoration:none;">
                  WhatsApp
                </a>
                antes de finalizar.
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f9f6f2;padding:24px 48px;
                       text-align:center;border-top:1px solid #ede8e2;">
              <p style="color:#ccc;font-size:12px;margin:0;line-height:1.6;">
                © 2026 Lunea by Skin · Todos os direitos reservados<br>
                <a href="${process.env.FRONTEND_URL}"
                  style="color:#ccc;text-decoration:none;">
                  luneabyskin.com.br
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

    // Dispara via Resend
    const { error: resendError } = await resend.emails.send({
      from:    process.env.EMAIL_FROM || "Lunea <contato@luneabyskin.com.br>",
      to:      carrinho.usuario_email,
      subject: `${nomeCliente}, seu carrinho está te esperando 🌙`,
      html:    htmlEmail,
    });

    if (resendError) {
      console.error("[Resend]", resendError);
      return res.status(500).json({ erro: "Erro ao enviar email", detalhe: resendError });
    }

    // Marca carrinho como email enviado
    await pool.query(
      `UPDATE carrinhos
       SET email_enviado = TRUE, email_enviado_em = NOW()
       WHERE id = $1`,
      [carrinho_id]
    );

    // Registra no log
    await pool.query(
      `INSERT INTO carrinho_emails_log
         (carrinho_id, usuario_id, email_destino, status)
       VALUES ($1, $2, $3, 'enviado')`,
      [carrinho_id, carrinho.usuario_id, carrinho.usuario_email]
    );

    return res.json({
      mensagem: "Email enviado com sucesso",
      email:    carrinho.usuario_email,
    });
  } catch (error) {
    console.error("[POST /carrinho/admin/email]", error);
    return res.status(500).json({ erro: "Erro interno ao enviar email" });
  }
});

// ==========================================================
// JOB AUTOMÁTICO — detectar carrinhos abandonados
// Roda a cada 5 minutos
// ==========================================================

cron.schedule("*/5 * * * *", async () => {
  try {
    const { rowCount } = await pool.query(
      `UPDATE carrinhos
       SET status = 'abandonado'
       WHERE status = 'ativo'
         AND atualizado_em < NOW() - INTERVAL '${MINUTOS_ABANDONO} minutes'
         AND id IN (
           SELECT DISTINCT carrinho_id FROM carrinho_itens
         )`
    );

    if (rowCount && rowCount > 0) {
      console.log(`[CRON] ${rowCount} carrinho(s) marcado(s) como abandonado`);
    }
  } catch (error) {
    console.error("[CRON abandono]", error);
  }
});

export default router;