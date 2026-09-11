import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { actualizar, crear, eliminar, listar } from "./meta.controller";
import { metaSchema } from "./meta.schema";

const router = Router();

router.use(authMiddleware);

router.get("/", listar);
router.post("/", validate(metaSchema), crear);
router.put("/:id", validate(metaSchema.partial()), actualizar);
router.delete("/:id", eliminar);

export default router;
