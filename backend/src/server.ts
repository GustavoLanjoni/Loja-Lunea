import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import produtosRoutes from "./routes/produtos.routes";
import categoriasRoutes from "./routes/categorias.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../../frontend")));

app.use("/produtos", produtosRoutes);
app.use("/categorias", categoriasRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/lunea.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/login.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/admin.html"));
});

app.get("/admin-produtos", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/admin-produtos.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor da Lunea rodando na porta ${PORT}`);
});