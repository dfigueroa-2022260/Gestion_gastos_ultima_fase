import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { obtenerSaldo } from './balance.service';

const router = Router();
router.use(authMiddleware);
router.get('/', asyncHandler(async (req, res) => {
  const hasta = req.query.hasta;
  if (hasta !== undefined && (typeof hasta !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(hasta) || !Number.isFinite(Date.parse(hasta)))) {
    throw new AppError('Fecha de consulta inválida.', 422);
  }
  res.json(await obtenerSaldo(req.usuarioId!, hasta as string | undefined));
}));
export default router;
