import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";

import produtosRoutes    from "./routes/produtos.routes";
import categoriasRoutes  from "./routes/categorias.routes";
import usuariosRoutes    from "./routes/usuarios.routes";
import favoritosRoutes   from "./routes/favoritos.routes";
import destaqueRoutes    from "./routes/destaque.routes";
import dicasRoutes       from "./routes/dicas.routes";
import colecoesRoutes    from "./routes/colecoes.routes";
import carrinhoRoutes    from "./routes/carrinho.routes"; 

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "../../frontend")));
app.use("/uploads", express.static(path.join(__dirname, "../../uploads")));

// ---- ROTAS DA API ----
app.use("/produtos",   produtosRoutes);
app.use("/categorias", categoriasRoutes);
app.use("/usuarios",   usuariosRoutes);
app.use("/favoritos",  favoritosRoutes);
app.use("/destaque",   destaqueRoutes);
app.use("/dicas",      dicasRoutes);
app.use("/colecoes",   colecoesRoutes);
app.use("/carrinho",   carrinhoRoutes); 

// ---- PÁGINAS DA LOJA ----
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/loja/lunea.html"));
});

app.get("/lunea.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/loja/lunea.html"));
});

app.get("/produto", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/loja/produto.html"));
});

app.get("/categoria", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/loja/categoria.html"));
});

app.get("/dica", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/loja/dica.html"));
});

app.get("/carrinho", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/loja/carrinho.html"));
});

app.get("/todos-produtos", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/loja/todos-produtos.html"));
});

// ---- PÁGINAS DE AUTH ----
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/auth/login.html"));
});

app.get("/cadastro", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/auth/cadastro-user.html"));
});


app.get("/perfil", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/perfil.html"));
});

// ---- PÁGINAS ADMIN ----
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/admin/admin.html"));
});

app.get("/admin-produtos", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/admin/admin-produtos.html"));
});

app.get("/admin-lista-produtos", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/admin/admin-lista-produtos.html"));
});

app.get("/admin-categorias", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/admin/admin-categorias.html"));
});

app.get("/admin-destaque", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/admin/admin-destaque.html"));
});

app.get("/admin-dicas", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/admin/admin-dicas.html"));
});

app.get("/admin-cadastrar-produto", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/admin/admin-cadastrar-produto.html"));
});


app.get("/admin-carrinhos", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/pages/admin/admin-carrinhos.html"));
});







// ---- SERVIDOR ----
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor da Lunea rodando na porta ${PORT}`);
});