import { conSaldoValidado } from '../balance/balance.service';
import { Prisma } from '@prisma/client';
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { GastoInput } from "./gasto.schema";

export const listarGastos = (usuarioId: string) => {
  return prisma.gasto.findMany({
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

export const crearGasto = async (usuarioId: string, data: GastoInput) => conSaldoValidado(usuarioId, async tx => {
  await validarCategoria(tx, usuarioId, data.categoriaId);

  return tx.gasto.create({
    data: { ...data, usuarioId },
    include: { categoria: true },
  });
});

export const actualizarGasto = async (
  usuarioId: string,
  id: string,
  data: GastoInput
) => conSaldoValidado(usuarioId, async tx => {
  const gasto = await tx.gasto.findFirst({ where: { id, usuarioId } });

  if (!gasto) {
    throw new AppError("Gasto no encontrado", 404);
  }

  await validarCategoria(tx, usuarioId, data.categoriaId);

  return tx.gasto.update({
    where: { id },
    data,
    include: { categoria: true },
  });
});

export const eliminarGasto = async (usuarioId: string, id: string) => conSaldoValidado(usuarioId, async tx => {
  const gasto = await tx.gasto.findFirst({ where: { id, usuarioId } });

  if (!gasto) {
    throw new AppError("Gasto no encontrado", 404);
  }

  await tx.gasto.delete({ where: { id } });
});

export const resumenPorCategoria = async (usuarioId: string) => {
  const resultado = await prisma.gasto.groupBy({
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
