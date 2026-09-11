import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { MetaInput } from "./meta.schema";

export const listarMetas = (usuarioId: string) => {
  return prisma.meta.findMany({
    where: { usuarioId },
    orderBy: { createdAt: "desc" },
  });
};

export const crearMeta = (usuarioId: string, data: MetaInput) => {
  return prisma.meta.create({ data: { ...data, usuarioId } });
};

export const actualizarMeta = async (
  usuarioId: string,
  id: string,
  data: Partial<MetaInput>
) => {
  const meta = await prisma.meta.findFirst({ where: { id, usuarioId } });

  if (!meta) {
    throw new AppError("Meta no encontrada", 404);
  }

  return prisma.meta.update({ where: { id }, data });
};

export const eliminarMeta = async (usuarioId: string, id: string) => {
  const meta = await prisma.meta.findFirst({ where: { id, usuarioId } });

  if (!meta) {
    throw new AppError("Meta no encontrada", 404);
  }

  await prisma.meta.delete({ where: { id } });
};
