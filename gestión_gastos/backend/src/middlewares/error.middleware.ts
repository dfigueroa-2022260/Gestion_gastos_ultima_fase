import { Prisma } from '@prisma/client';
import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({error:'Ya existe un registro con ese nombre.'});
    if (err.code === 'P2003') return res.status(409).json({error:'No puedes eliminar una categoría que tiene movimientos asociados.'});
  }
  console.error(err);
  return res.status(500).json({ error: "Error interno del servidor" });
};

export const notFoundMiddleware = (_req: Request, res: Response) => {
  res.status(404).json({ error: "Ruta no encontrada" });
};
