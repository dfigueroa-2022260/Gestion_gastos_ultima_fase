import cors from "cors";
import express from "express";
import { errorMiddleware, notFoundMiddleware } from "./middlewares/error.middleware";
import ahorroRoutes from "./modules/ahorros/ahorro.routes";
import authRoutes from "./modules/auth/auth.routes";
import categoriaRoutes from "./modules/categorias/categoria.routes";
import etiquetaRoutes from "./modules/etiquetas/etiqueta.routes";
import gastoRoutes from "./modules/gastos/gasto.routes";
import ingresoRoutes from "./modules/ingresos/ingreso.routes";
import usuarioRoutes from "./modules/usuarios/usuario.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/etiquetas", etiquetaRoutes);
app.use("/api/gastos", gastoRoutes);
app.use("/api/ingresos", ingresoRoutes);
app.use("/api/ahorros", ahorroRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
