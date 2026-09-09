import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  actualizarAhorro,
  crearAhorro,
  eliminarAhorro,
  listarAhorros,
  resumenPorCategoria,
} from "./ahorro.service";

export const listar = asyncHandler(async (req: Request, res: Response) => {
  const ahorros = await listarAhorros(req.usuarioId as string);
  res.status(200).json(ahorros);
});

export const crear = asyncHandler(async (req: Request, res: Response) => {
  const ahorro = await crearAhorro(req.usuarioId as string, req.body);
  res.status(201).json(ahorro);
});

export const actualizar = asyncHandler(async (req: Request, res: Response) => {
  const ahorro = await actualizarAhorro(
    req.usuarioId as string,
    req.params.id,
    req.body
  );
  res.status(200).json(ahorro);
});

export const eliminar = asyncHandler(async (req: Request, res: Response) => {
  await eliminarAhorro(req.usuarioId as string, req.params.id);
  res.status(204).send();
});

export const resumen = asyncHandler(async (req: Request, res: Response) => {
  const data = await resumenPorCategoria(req.usuarioId as string);
  res.status(200).json(data);
});
