import { randomBytes } from 'crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { env } from '../../../config/env';
import { prisma } from '../../../config/prisma';
import { validate } from '../../../middlewares/validate.middleware';
import { asyncHandler } from '../../../utils/asyncHandler';
import { AppError } from '../../../utils/AppError';
import { generarToken } from '../../../utils/jwt.util';
import { comparePassword, hashPassword } from '../../../utils/password.util';

const router = Router();
const client = new OAuth2Client();
const schema = z.object({
  credential: z.string().min(1).max(10000),
  challenge: z.string().min(1).max(2000),
  password: z.string().min(1).max(200).optional(),
});

router.get('/config', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!env.googleClientId) { res.json({ clientId: null }); return; }
  const challenge = jwt.sign({ purpose: 'google-login', nonce: randomBytes(24).toString('hex') }, env.jwtSecret, { algorithm: 'HS256', expiresIn: '5m' });
  res.json({ clientId: env.googleClientId, challenge });
});

router.post('/', validate(schema), asyncHandler(async (req, res) => {
  if (!env.googleClientId) throw new AppError('El acceso con Google todavía no está configurado.', 503);
  if (!req.headers.origin || !env.googleOrigins.includes(req.headers.origin)) throw new AppError('Origen no autorizado para iniciar sesión.', 403);
  const { credential, challenge, password } = req.body as z.infer<typeof schema>;
  try {
    const data = jwt.verify(challenge, env.jwtSecret, { algorithms: ['HS256'] });
    if (typeof data === 'string' || data.purpose !== 'google-login') throw new Error('Invalid challenge');
  } catch { throw new AppError('La solicitud de Google expiró. Recargá el login e intentá de nuevo.', 400); }

  const payload = await client.verifyIdToken({ idToken: credential, audience: env.googleClientId })
    .then(ticket => ticket.getPayload()).catch(() => null);
  if (!payload?.sub || !payload.email || !payload.email_verified || (payload as typeof payload & { nonce?: string }).nonce !== challenge) {
    throw new AppError('No se pudo verificar tu identidad con Google.', 401);
  }

  let usuario = await prisma.usuario.findUnique({ where: { googleId: payload.sub } });
  if (!usuario) {
    const email = payload.email.trim().toLowerCase();
    const existente = await prisma.usuario.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (existente) {
      if (existente.googleId && existente.googleId !== payload.sub) throw new AppError('Esta cuenta ya está vinculada a otra identidad de Google.', 409);
      if (!password) {
        res.status(409).json({ code: 'GOOGLE_LINK_REQUIRED', error: 'Ya tenés una cuenta local con este correo. Confirmá su contraseña para vincular Google.' });
        return;
      }
      if (!await comparePassword(password, existente.password)) throw new AppError('La contraseña de tu cuenta local no es correcta.', 401);
      const vinculada = await prisma.usuario.updateMany({ where: { id: existente.id, googleId: null }, data: { googleId: payload.sub } });
      if (!vinculada.count) throw new AppError('La cuenta cambió. Volvé a iniciar sesión con Google.', 409);
      usuario = { ...existente, googleId: payload.sub };
    } else {
      // Una contraseña aleatoria desconocida conserva el esquema del login local.
      // No se usa el token de Google como contraseña ni se guarda en la base.
      usuario = await prisma.usuario.create({ data: {
        nombre: payload.name?.trim() || email.split('@')[0], email,
        googleId: payload.sub, password: await hashPassword(randomBytes(48).toString('hex')), rol: 'USUARIO',
      } });
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({ token: generarToken({ usuarioId: usuario.id, rol: usuario.rol }), usuario: {
    id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol,
  } });
}));

export default router;
