import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { AhorroInput } from "./ahorro.schema";

export const listarAhorros = (usuarioId: string) => {
  return prisma.ahorro.findMany({
    where: { usuarioId },
    include: { categoria: true },
    orderBy: { fecha: "desc" },
  });
};

const validarCategoria = async (usuarioId: string, categoriaId: string) => {
  const categoria = await prisma.categoria.findFirst({
    where: { id: categoriaId, usuarioId },
  });

  if (!categoria) {
    throw new AppError("Categoria no encontrada", 404);
  }
};

export const crearAhorro = async (usuarioId: string, data: AhorroInput) => {
  await validarCategoria(usuarioId, data.categoriaId);

  return prisma.ahorro.create({
    data: { ...data, usuarioId },
    include: { categoria: true },
  });
};

export const actualizarAhorro = async (
  usuarioId: string,
  id: string,
  data: AhorroInput
) => {
  const ahorro = await prisma.ahorro.findFirst({ where: { id, usuarioId } });

  if (!ahorro) {
    throw new AppError("Ahorro no encontrado", 404);
  }

  await validarCategoria(usuarioId, data.categoriaId);

  return prisma.ahorro.update({
    where: { id },
    data,
    include: { categoria: true },
  });
};

export const eliminarAhorro = async (usuarioId: string, id: string) => {
  const ahorro = await prisma.ahorro.findFirst({ where: { id, usuarioId } });

  if (!ahorro) {
    throw new AppError("Ahorro no encontrado", 404);
  }

  await prisma.ahorro.delete({ where: { id } });
};

// El resumen por categoria solo considera depositos (representa de donde
// viene el ahorro acumulado, un retiro no "pertenece" a una categoria).
export const resumenPorCategoria = async (usuarioId: string) => {
  const resultado = await prisma.ahorro.groupBy({
    by: ["categoriaId"],
    where: { usuarioId, tipo: "DEPOSITO" },
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
