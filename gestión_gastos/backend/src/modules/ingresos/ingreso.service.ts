import { conSaldoValidado } from '../balance/balance.service';
import { Prisma } from '@prisma/client';
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { IngresoInput } from "./ingreso.schema";

export const listarIngresos = (usuarioId: string) => {
  return prisma.ingreso.findMany({
    where: { usuarioId },
    include: { categoria: true },
    orderBy: { fecha: "desc" },
  });
};

const validarCategoria = async (tx: Prisma.TransactionClient, usuarioId: string, categoriaId: string) => {
  const categoria = await tx.categoria.findFirst({
    where: { id: categoriaId, usuarioId },
  });

  if (!categoria) {
    throw new AppError("Categoria no encontrada", 404);
  }
};

export const crearIngreso = async (usuarioId: string, data: IngresoInput) => conSaldoValidado(usuarioId, async tx => {
  await validarCategoria(tx, usuarioId, data.categoriaId);

  return tx.ingreso.create({
    data: { ...data, usuarioId },
    include: { categoria: true },
  });
});

export const actualizarIngreso = async (
  usuarioId: string,
  id: string,
  data: IngresoInput
) => conSaldoValidado(usuarioId, async tx => {
  const ingreso = await tx.ingreso.findFirst({ where: { id, usuarioId } });

  if (!ingreso) {
    throw new AppError("Ingreso no encontrado", 404);
  }

  await validarCategoria(tx, usuarioId, data.categoriaId);

  return tx.ingreso.update({
    where: { id },
    data,
    include: { categoria: true },
  });
});

export const eliminarIngreso = async (usuarioId: string, id: string) => conSaldoValidado(usuarioId, async tx => {
  const ingreso = await tx.ingreso.findFirst({ where: { id, usuarioId } });

  if (!ingreso) {
    throw new AppError("Ingreso no encontrado", 404);
  }

  await tx.ingreso.delete({ where: { id } });
});

export const resumenPorCategoria = async (usuarioId: string) => {
  const resultado = await prisma.ingreso.groupBy({
    by: ["categoriaId"],
    where: { usuarioId },
    _sum: { monto: true },
  });

  const categorias = await prisma.categoria.findMany({
    where: { usuarioId },
  });

  return resultado.map((r) => {
    const categoria = categorias.find((c) => c.id === r.categoriaId);
    return {
      categoriaId: r.categoriaId,
      nombre: categoria?.nombre ?? "Sin categoria",
      color: categoria?.color ?? "#5C6B85",
      total: r._sum.monto ?? 0,
    };
  });
};
