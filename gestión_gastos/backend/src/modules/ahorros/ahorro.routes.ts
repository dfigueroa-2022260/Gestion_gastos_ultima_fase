import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  actualizar,
  crear,
  eliminar,
  listar,
  resumen,
} from "./ahorro.controller";
import { ahorroSchema } from "./ahorro.schema";

const router = Router();

router.use(authMiddleware);

router.get("/", listar);
router.get("/resumen", resumen);
router.post("/", validate(ahorroSchema), crear);
router.put("/:id", validate(ahorroSchema), actualizar);
router.delete("/:id", eliminar);

export default router;
