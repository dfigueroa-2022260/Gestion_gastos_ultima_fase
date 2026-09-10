import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { actualizar, crear, eliminar, listar } from "./etiqueta.controller";
import { etiquetaSchema } from "./etiqueta.schema";

const router = Router();

router.use(authMiddleware);

router.get("/", listar);
router.post("/", validate(etiquetaSchema), crear);
router.put("/:id", validate(etiquetaSchema), actualizar);
router.delete("/:id", eliminar);

export default router;
