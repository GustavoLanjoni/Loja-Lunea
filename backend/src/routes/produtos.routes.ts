import { Router } from "express";
import multer from "multer";
import { pool } from "../database/connection";
import { supabase } from "../database/supabase";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 5,
    fileSize: 5 * 1024 * 1024,
  },
});

router.get("/", async (req, res) => {
  try {
    const resultado = await pool.query(`
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
            ORDER BY pi.ordem ASC
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) AS imagens
      FROM produtos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN produto_imagens pi ON pi.produto_id = p.id
      GROUP BY p.id, c.nome
      ORDER BY p.id DESC
    `);

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao listar produtos" });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

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
            ORDER BY pi.ordem ASC
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) AS imagens
      FROM produtos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN produto_imagens pi ON pi.produto_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, c.nome
      `,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: "Produto não encontrado",
      });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      erro: "Erro ao buscar produto",
    });
  }
});

router.post("/", upload.array("imagens", 5), async (req, res) => {
  const { nome, descricao, preco, categoria_id, estoque } = req.body;
  const arquivos = req.files as Express.Multer.File[];

  try {
    const produtoCriado = await pool.query(
      `INSERT INTO produtos 
      (nome, descricao, preco, categoria_id, estoque, ativo)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *`,
      [nome, descricao, preco, categoria_id, estoque]
    );

    const produto = produtoCriado.rows[0];

    if (arquivos && arquivos.length > 0) {
      for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];

        const nomeOriginalSeguro = arquivo.originalname
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9.-]/g, "")
          .toLowerCase();

        const nomeArquivo = `produto-${produto.id}/${Date.now()}-${i}-${nomeOriginalSeguro}`;

        const { error: uploadError } = await supabase.storage
          .from("produtos")
          .upload(nomeArquivo, arquivo.buffer, {
            contentType: arquivo.mimetype,
            upsert: false,
          });

        if (uploadError) {
          console.error("Erro ao enviar imagem:", uploadError);
          continue;
        }

        const { data } = supabase.storage
          .from("produtos")
          .getPublicUrl(nomeArquivo);

        await pool.query(
          `INSERT INTO produto_imagens 
          (produto_id, imagem_url, ordem)
          VALUES ($1, $2, $3)`,
          [produto.id, data.publicUrl, i]
        );
      }
    }

    const produtoCompleto = await pool.query(
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
            ORDER BY pi.ordem ASC
          ) FILTER (WHERE pi.id IS NOT NULL),
          '[]'
        ) AS imagens
      FROM produtos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN produto_imagens pi ON pi.produto_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, c.nome
      `,
      [produto.id]
    );

    res.status(201).json({
      mensagem: "Produto cadastrado com sucesso",
      produto: produtoCompleto.rows[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao cadastrar produto" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, preco, categoria_id, estoque, ativo } = req.body;

  try {
    const resultado = await pool.query(
      `UPDATE produtos 
       SET nome = $1,
           descricao = $2,
           preco = $3,
           categoria_id = $4,
           estoque = $5,
           ativo = $6
       WHERE id = $7
       RETURNING *`,
      [nome, descricao, preco, categoria_id, estoque, ativo, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao atualizar produto" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await pool.query(
      "DELETE FROM produtos WHERE id = $1 RETURNING *",
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    res.json({ mensagem: "Produto excluído com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao excluir produto" });
  }
});

export default router;