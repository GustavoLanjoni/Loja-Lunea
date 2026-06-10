import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../database/supabase";

const router = Router();

const COOKIE_NAME = "lunea_session";

function calcularExpiracao() {
  const data = new Date();
  data.setDate(data.getDate() + 7);
  return data;
}

async function autenticarUsuario(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        erro: "Usuário não autenticado",
      });
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
      return res.status(401).json({
        erro: "Sessão inválida ou expirada",
      });
    }

    (req as any).usuario = sessao.usuarios;

    next();
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao autenticar usuário",
    });
  }
}

router.post("/cadastro", async (req, res) => {
  try {
    const { nome, email, telefone, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        erro: "Nome, e-mail e senha são obrigatórios",
      });
    }

    const { data: usuarioExistente } = await supabase
      .from("usuarios")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (usuarioExistente) {
      return res.status(400).json({
        erro: "E-mail já cadastrado",
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const { data, error } = await supabase
      .from("usuarios")
      .insert([
        {
          nome,
          email,
          telefone,
          senha: senhaHash,
          cargo: "cliente",
          ativo: true,
        },
      ])
      .select("id, nome, email, telefone, cargo, ativo, criado_em")
      .single();

    if (error) throw error;

    return res.status(201).json({
      mensagem: "Usuário cadastrado com sucesso",
      usuario: data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao cadastrar usuário",
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        erro: "E-mail e senha são obrigatórios",
      });
    }

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("*")
      .eq("email", email)
      .eq("ativo", true)
      .maybeSingle();

    if (!usuario) {
      return res.status(400).json({
        erro: "Usuário não encontrado",
      });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({
        erro: "Senha inválida",
      });
    }

    const token = uuidv4();
    const expiraEm = calcularExpiracao();

    const { error: erroSessao } = await supabase
      .from("sessoes_usuarios")
      .insert([
        {
          usuario_id: usuario.id,
          token,
          expira_em: expiraEm.toISOString(),
          ativo: true,
        },
      ]);

    if (erroSessao) throw erroSessao;

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      mensagem: "Login realizado com sucesso",
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        cargo: usuario.cargo,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao fazer login",
    });
  }
});

router.get("/perfil", autenticarUsuario, async (req, res) => {
  return res.json({
    usuario: (req as any).usuario,
  });
});

router.put("/perfil", autenticarUsuario, async (req, res) => {
  try {
    const usuarioLogado = (req as any).usuario;
    const { nome, telefone } = req.body;

    const { data, error } = await supabase
      .from("usuarios")
      .update({
        nome,
        telefone,
      })
      .eq("id", usuarioLogado.id)
      .select("id, nome, email, telefone, cargo, ativo, criado_em")
      .single();

    if (error) throw error;

    return res.json({
      mensagem: "Perfil atualizado com sucesso",
      usuario: data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao atualizar perfil",
    });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (token) {
      await supabase
        .from("sessoes_usuarios")
        .update({ ativo: false })
        .eq("token", token);
    }

    res.clearCookie(COOKIE_NAME);

    return res.json({
      mensagem: "Logout realizado com sucesso",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao sair da conta",
    });
  }
});


router.get("/sessao", autenticarUsuario, async (req, res) => {
  return res.json({
    logado: true,
    usuario: (req as any).usuario
  });
});

export default router;