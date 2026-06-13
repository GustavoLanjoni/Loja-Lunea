import { Router, Request, Response, NextFunction } from "express";
import { supabase } from "../database/supabase";

const router = Router();
const COOKIE_NAME = "lunea_session";

async function autenticarUsuario(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    const agora = new Date().toISOString();

    const { data: sessao, error } = await supabase
      .from("sessoes_usuarios")
      .select(`
        usuario_id,
        usuarios (
          id,
          nome,
          email
        )
      `)
      .eq("token", token)
      .eq("ativo", true)
      .gt("expira_em", agora)
      .single();

    if (error || !sessao) {
      return res.status(401).json({ erro: "Sessão inválida" });
    }

    (req as any).usuario = sessao.usuarios;

    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao autenticar usuário" });
  }
}

router.get("/", autenticarUsuario, async (req, res) => {
  try {
    const usuario = (req as any).usuario;

    const { data, error } = await supabase
      .from("favoritos")
      .select(`
        id,
        produto_id,
        produtos (
          id,
          nome,
          descricao,
          preco,
          ativo,
          categoria_id,
          produto_imagens (
            imagem_url,
            ordem
          )
        )
      `)
      .eq("usuario_id", usuario.id)
      .order("id", { ascending: false });

    if (error) throw error;

    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao listar favoritos" });
  }
});

router.post("/:produtoId", autenticarUsuario, async (req, res) => {
  try {
    const usuario = (req as any).usuario;
    const { produtoId } = req.params;

    const { error } = await supabase
      .from("favoritos")
      .insert([
        {
          usuario_id: usuario.id,
          produto_id: Number(produtoId),
        },
      ]);

    if (error && error.code !== "23505") {
      throw error;
    }

    return res.status(201).json({ mensagem: "Produto favoritado" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao favoritar produto" });
  }
});

router.delete("/:produtoId", autenticarUsuario, async (req, res) => {
  try {
    const usuario = (req as any).usuario;
    const { produtoId } = req.params;

    const { error } = await supabase
      .from("favoritos")
      .delete()
      .eq("usuario_id", usuario.id)
      .eq("produto_id", Number(produtoId));

    if (error) throw error;

    return res.json({ mensagem: "Produto removido dos favoritos" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro ao remover favorito" });
  }
});

export default router;