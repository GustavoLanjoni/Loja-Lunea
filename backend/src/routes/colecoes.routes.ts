import { Router } from "express";
import { pool } from "../database/connection";

const router = Router();

/* =========================================================
   LISTAR COLEÇÕES ATIVAS - LOJA
   GET /colecoes
========================================================= */

router.get("/", async (req, res) => {
  try {
    const resultado = await pool.query(
      `
      SELECT *
      FROM colecoes
      WHERE ativo = true
      ORDER BY ordem ASC, nome ASC
      `
    );

    res.json(resultado.rows);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      erro: "Erro ao listar coleções",
      detalhes: error.message,
    });
  }
});

/* =========================================================
   LISTAR TODAS AS COLEÇÕES - ADMIN
   GET /colecoes/admin
========================================================= */

router.get("/admin", async (req, res) => {
  try {
    const resultado = await pool.query(
      `
      SELECT *
      FROM colecoes
      ORDER BY ordem ASC, nome ASC
      `
    );

    res.json(resultado.rows);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      erro: "Erro ao listar coleções no admin",
      detalhes: error.message,
    });
  }
});

/* =========================================================
   CRIAR COLEÇÃO
   POST /colecoes
========================================================= */

router.post("/", async (req, res) => {
  const { nome, slug, descricao, ordem, ativo } = req.body;

  if (!nome || !slug) {
    return res.status(400).json({
      erro: "Nome e slug são obrigatórios",
    });
  }

  try {
    const resultado = await pool.query(
      `
      INSERT INTO colecoes (nome, slug, descricao, ordem, ativo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        nome,
        slug,
        descricao || null,
        ordem || 0,
        ativo === undefined ? true : ativo,
      ]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (error: any) {
    console.error(error);

    if (error.code === "23505") {
      return res.status(400).json({
        erro: "Já existe uma coleção com esse slug",
      });
    }

    res.status(500).json({
      erro: "Erro ao criar coleção",
      detalhes: error.message,
    });
  }
});

/* =========================================================
   EDITAR COLEÇÃO
   PUT /colecoes/:id
========================================================= */

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, slug, descricao, ordem, ativo } = req.body;

  if (!nome || !slug) {
    return res.status(400).json({
      erro: "Nome e slug são obrigatórios",
    });
  }

  try {
    const resultado = await pool.query(
      `
      UPDATE colecoes
      SET
        nome = $1,
        slug = $2,
        descricao = $3,
        ordem = $4,
        ativo = $5
      WHERE id = $6
      RETURNING *
      `,
      [
        nome,
        slug,
        descricao || null,
        ordem || 0,
        ativo === undefined ? true : ativo,
        id,
      ]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        erro: "Coleção não encontrada",
      });
    }

    res.json(resultado.rows[0]);
  } catch (error: any) {
    console.error(error);

    if (error.code === "23505") {
      return res.status(400).json({
        erro: "Já existe uma coleção com esse slug",
      });
    }

    res.status(500).json({
      erro: "Erro ao editar coleção",
      detalhes: error.message,
    });
  }
});

/* =========================================================
   EXCLUIR COLEÇÃO
   DELETE /colecoes/:id
========================================================= */

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await pool.query(
      `
      DELETE FROM colecoes
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        erro: "Coleção não encontrada",
      });
    }

    res.json({
      mensagem: "Coleção excluída com sucesso",
      colecao: resultado.rows[0],
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      erro: "Erro ao excluir coleção",
      detalhes: error.message,
    });
  }
});

/* =========================================================
   BUSCAR COLEÇÕES DE UM PRODUTO
   GET /colecoes/produto/:produtoId
========================================================= */

router.get("/produto/:produtoId", async (req, res) => {
  const { produtoId } = req.params;

  try {
    const resultado = await pool.query(
      `
      SELECT c.*
      FROM produto_colecoes pc
      JOIN colecoes c ON c.id = pc.colecao_id
      WHERE pc.produto_id = $1
      ORDER BY c.ordem ASC, c.nome ASC
      `,
      [produtoId]
    );

    res.json(resultado.rows);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      erro: "Erro ao buscar coleções do produto",
      detalhes: error.message,
    });
  }
});

/* =========================================================
   VINCULAR PRODUTO A COLEÇÕES
   POST /colecoes/produto
   body: { produto_id: 1, colecoes_ids: [1, 2, 3] }
========================================================= */

router.post("/produto", async (req, res) => {
  const { produto_id, colecoes_ids } = req.body;

  if (!produto_id) {
    return res.status(400).json({
      erro: "produto_id é obrigatório",
    });
  }

  if (!Array.isArray(colecoes_ids)) {
    return res.status(400).json({
      erro: "colecoes_ids precisa ser uma lista",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      DELETE FROM produto_colecoes
      WHERE produto_id = $1
      `,
      [produto_id]
    );

    for (const colecaoId of colecoes_ids) {
      await client.query(
        `
        INSERT INTO produto_colecoes (produto_id, colecao_id)
        VALUES ($1, $2)
        ON CONFLICT (produto_id, colecao_id) DO NOTHING
        `,
        [produto_id, colecaoId]
      );
    }

    await client.query("COMMIT");

    res.json({
      mensagem: "Coleções do produto atualizadas com sucesso",
    });
  } catch (error: any) {
    await client.query("ROLLBACK");

    console.error(error);
    res.status(500).json({
      erro: "Erro ao vincular produto às coleções",
      detalhes: error.message,
    });
  } finally {
    client.release();
  }
});

/* =========================================================
   LISTAR PRODUTOS DE UMA COLEÇÃO
   GET /colecoes/:slug/produtos
========================================================= */


router.get("/:slug/produtos", async (req, res) => {
  const { slug } = req.params;

  try {
    const resultado = await pool.query(
      `
      SELECT
        p.*,
        c.nome AS categoria_nome,

        COALESCE(
          json_agg(
            json_build_object(
              'id', pi.id,
              'imagem_url', pi.imagem_url,
              'ordem', pi.ordem
            )
            ORDER BY pi.ordem
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) AS imagens

      FROM produto_colecoes pc

      JOIN colecoes col
        ON col.id = pc.colecao_id

      JOIN produtos p
        ON p.id = pc.produto_id

      LEFT JOIN categorias c
        ON c.id = p.categoria_id

      LEFT JOIN produto_imagens pi
        ON pi.produto_id = p.id

      WHERE col.slug = $1

      GROUP BY
        p.id,
        c.nome

      ORDER BY p.id DESC
      `,
      [slug]
    );

    res.json(resultado.rows);
  } catch (error: any) {
    console.error(error);

    res.status(500).json({
      erro: "Erro ao listar produtos da coleção",
      detalhes: error.message,
    });
  }
});



export default router;