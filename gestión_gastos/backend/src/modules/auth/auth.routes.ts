import { authMiddleware } from '../../middlewares/auth.middleware';
import { generarToken } from '../../utils/jwt.util';
import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { login, olvidePassword, registro, resetPassword } from "./auth.controller";
import {
  loginSchema,
  olvidePasswordSchema,
  registroSchema,
  resetPasswordSchema,
} from "./auth.schema";

const router = Router();
router.post('/renovar', authMiddleware, (req, res) => {
  res.json({token: generarToken({usuarioId:req.usuarioId!, rol:req.usuarioRol!})});
});

router.post("/registro", validate(registroSchema), registro);
router.post("/login", validate(loginSchema), login);
router.post("/olvide-password", validate(olvidePasswordSchema), olvidePassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;
