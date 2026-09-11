import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  actualizarMeta,
  crearMeta,
  eliminarMeta,
  listarMetas,
} from "./meta.service";

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const metas = await listarMetas(req.usuarioId as string);
  res.status(200).json(metas);
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const meta = await crearMeta(req.usuarioId as string, req.body);
  res.status(201).json(meta);
});

export const actualizar = asyncHandler(async (req: Request, res: Response) => {
  const meta = await actualizarMeta(req.usuarioId as string, req.params.id, req.body);
  res.status(200).json(meta);
});

export const eliminar = asyncHandler(async (req: Request, res: Response) => {
  await eliminarMeta(req.usuarioId as string, req.params.id);
  res.status(204).send();
});
