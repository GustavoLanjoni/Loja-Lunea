import { Router } from "express";
import { supabase } from "../database/supabase";

const router = Router();

/* LISTAR DICAS ATIVAS - LOJA */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("dicas")
      .select("*")
      .eq("ativo", true)
      .order("id", { ascending: true });

    if (error) throw error;

    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      erro: "Erro ao listar dicas",
    });
  }
});

/* LISTAR TODAS - ADMIN */
router.get("/admin", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("dicas")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      erro: "Erro ao listar dicas no admin",
    });
  }
});

/* BUSCAR UMA DICA COM PRODUTOS */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data: dica, error: erroDica } = await supabase
      .from("dicas")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (erroDica) throw erroDica;

    if (!dica) {
      return res.status(404).json({
        erro: "Dica não encontrada",
      });
    }

    const { data: produtosRelacionados, error: erroProdutos } = await supabase
      .from("dica_produtos")
      .select(`
        id,
        produto_id,
        produtos (
          id,
          nome,
          descricao,
          preco,
          imagem,
          ativo,
          produto_imagens (
            id,
            imagem_url,
            ordem
          )
        )
      `)
      .eq("dica_id", id);

    if (erroProdutos) throw erroProdutos;

    return res.json({
      dica,
      produtos: produtosRelacionados || [],
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      erro: "Erro ao buscar dica",
    });
  }
});

/* CRIAR DICA */
router.post("/", async (req, res) => {
  try {
    const { titulo, resumo, conteudo, ativo, produtos_ids } = req.body;

    if (!titulo || !conteudo) {
      return res.status(400).json({
        erro: "Título e conteúdo são obrigatórios",
      });
    }

    const { data: dica, error } = await supabase
      .from("dicas")
      .insert([
        {
          titulo,
          resumo,
          conteudo,
          ativo,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    if (Array.isArray(produtos_ids) && produtos_ids.length > 0) {
      const vinculos = produtos_ids.map((produtoId: number) => ({
        dica_id: dica.id,
        produto_id: produtoId,
      }));

      const { error: erroVinculos } = await supabase
        .from("dica_produtos")
        .insert(vinculos);

      if (erroVinculos) throw erroVinculos;
    }

    return res.status(201).json({
      mensagem: "Dica criada com sucesso",
      dica,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      erro: "Erro ao criar dica",
    });
  }
});

/* ATUALIZAR DICA */
router.put("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { titulo, resumo, conteudo, ativo, produtos_ids } = req.body;

    if (!titulo || !conteudo) {
      return res.status(400).json({
        erro: "Título e conteúdo são obrigatórios",
      });
    }

    const { data: dica, error } = await supabase
      .from("dicas")
      .update({
        titulo,
        resumo,
        conteudo,
        ativo,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from("dica_produtos")
      .delete()
      .eq("dica_id", id);

    if (Array.isArray(produtos_ids) && produtos_ids.length > 0) {
      const vinculos = produtos_ids.map((produtoId: number) => ({
        dica_id: Number(id),
        produto_id: produtoId,
      }));

      const { error: erroVinculos } = await supabase
        .from("dica_produtos")
        .insert(vinculos);

      if (erroVinculos) throw erroVinculos;
    }

    return res.json({
      mensagem: "Dica atualizada com sucesso",
      dica,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      erro: "Erro ao atualizar dica",
    });
  }
});

/* DELETAR DICA */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from("dicas")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return res.json({
      mensagem: "Dica excluída com sucesso",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      erro: "Erro ao excluir dica",
    });
  }
});

export default router;