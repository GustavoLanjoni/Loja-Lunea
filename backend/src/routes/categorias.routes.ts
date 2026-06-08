import { Router } from "express";
import { pool } from "../database/connection";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT 
        c.*,
        COUNT(p.id) AS total_produtos
      FROM categorias c
      LEFT JOIN produtos p ON p.categoria_id = c.id
      GROUP BY c.id
      ORDER BY c.nome ASC
    `);

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao listar categorias" });
  }
});

router.post("/", async (req, res) => {
  const { nome } = req.body;

  try {
    const resultado = await pool.query(
      `INSERT INTO categorias (nome)
       VALUES ($1)
       RETURNING *`,
      [nome]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao cadastrar categoria" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const produtos = await pool.query(
      "SELECT id FROM produtos WHERE categoria_id = $1 LIMIT 1",
      [id]
    );

    if (produtos.rows.length > 0) {
      return res.status(400).json({
        erro: "Não é possível excluir categoria com produtos vinculados",
      });
    }

    const resultado = await pool.query(
      "DELETE FROM categorias WHERE id = $1 RETURNING *",
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: "Categoria não encontrada" });
    }

    res.json({ mensagem: "Categoria excluída com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao excluir categoria" });
  }
});

export default router;