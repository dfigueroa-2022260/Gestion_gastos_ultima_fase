import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  actualizarEtiqueta,
  crearEtiqueta,
  eliminarEtiqueta,
  listarEtiquetas,
} from "./etiqueta.service";

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const etiquetas = await listarEtiquetas(req.usuarioId as string);
  res.status(200).json(etiquetas);
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const etiqueta = await crearEtiqueta(req.usuarioId as string, req.body);
  res.status(201).json(etiqueta);
});

export const actualizar = asyncHandler(async (req: Request, res: Response) => {
  const etiqueta = await actualizarEtiqueta(
    req.usuarioId as string,
    req.params.id,
    req.body
  );
  res.status(200).json(etiqueta);
});

export const eliminar = asyncHandler(async (req: Request, res: Response) => {
  await eliminarEtiqueta(req.usuarioId as string, req.params.id);
  res.status(204).send();
});
