import { Router } from "express";
import multer from "multer";
import path from "path";
import { supabase } from "../database/supabase";

const router = Router();

const BUCKET_DESTAQUES = "destaques";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

/* BUSCAR DESTAQUE NA HOME */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("destaque_home")
      .select("*")
      .eq("ativo", true)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({
        erro: "Destaque não encontrado",
      });
    }

    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      erro: "Erro ao buscar destaque",
    });
  }
});

/* BUSCAR DESTAQUE NO ADMIN */
router.get("/admin", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("destaque_home")
      .select("*")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({
        erro: "Destaque não encontrado",
      });
    }

    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      erro: "Erro ao buscar destaque no admin",
    });
  }
});

/* ATUALIZAR DESTAQUE COM UPLOAD */
router.put("/", upload.single("imagem"), async (req, res) => {
  try {
    const {
      titulo,
      texto,
      botao_texto,
      botao_link,
      produto_id,
      ativo,
      imagem_url,
    } = req.body;

    if (!titulo || !texto) {
      return res.status(400).json({
        erro: "Título e texto são obrigatórios",
      });
    }

    const { data: destaqueAtual } = await supabase
      .from("destaque_home")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    let imagemUrlFinal = imagem_url || destaqueAtual?.imagem_url || "";

    if (req.file) {
      const extensao = path.extname(req.file.originalname) || ".jpg";
      const nomeArquivo = `destaque-${Date.now()}${extensao}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_DESTAQUES)
        .upload(nomeArquivo, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
        return res.status(500).json({
          erro: "Erro ao enviar imagem",
        });
      }

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_DESTAQUES)
        .getPublicUrl(nomeArquivo);

      imagemUrlFinal = publicUrlData.publicUrl;
    }

    if (!imagemUrlFinal) {
      return res.status(400).json({
        erro: "Imagem do destaque é obrigatória",
      });
    }

    const produtoIdFinal = produto_id ? Number(produto_id) : null;

    const linkFinal = produtoIdFinal
      ? `/produto?id=${produtoIdFinal}`
      : botao_link || "#produtos";

    const destaqueAtivo =
      ativo === true ||
      ativo === "true" ||
      ativo === "on" ||
      ativo === "1";

    const { data, error } = await supabase
      .from("destaque_home")
      .upsert(
        {
          id: 1,
          titulo,
          texto,
          imagem_url: imagemUrlFinal,
          botao_texto: botao_texto || "Ver produto",
          botao_link: linkFinal,
          produto_id: produtoIdFinal,
          ativo: destaqueAtivo,
          atualizado_em: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      )
      .select()
      .single();

    if (error) throw error;

    return res.json({
      mensagem: "Destaque atualizado com sucesso",
      destaque: data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      erro: "Erro ao atualizar destaque",
    });
  }
});

export default router;