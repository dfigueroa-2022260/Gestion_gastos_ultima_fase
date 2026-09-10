import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { EtiquetaInput } from "./etiqueta.schema";

export const listarEtiquetas = (usuarioId: string) => {
  return prisma.etiqueta.findMany({
    where: { usuarioId },
    orderBy: { nombre: "asc" },
  });
};

export const crearEtiqueta = async (usuarioId: string, data: EtiquetaInput) => {
  const existente = await prisma.etiqueta.findFirst({
    where: { usuarioId, nombre: data.nombre },
  });

  if (existente) {
    throw new AppError("Ya tienes una etiqueta con ese nombre", 409);
  }

  if (data.etiquetaPadreId) {
    const padre = await prisma.etiqueta.findFirst({
      where: { id: data.etiquetaPadreId, usuarioId },
    });
    if (!padre) {
      throw new AppError("La etiqueta principal no existe", 404);
    }
  }

  return prisma.etiqueta.create({
    data: { ...data, usuarioId },
  });
};

export const actualizarEtiqueta = async (
  usuarioId: string,
  id: string,
  data: EtiquetaInput
) => {
  const etiqueta = await prisma.etiqueta.findFirst({ where: { id, usuarioId } });

  if (!etiqueta) {
    throw new AppError("Etiqueta no encontrada", 404);
  }

  return prisma.etiqueta.update({ where: { id }, data });
};

export const eliminarEtiqueta = async (usuarioId: string, id: string) => {
  const etiqueta = await prisma.etiqueta.findFirst({ where: { id, usuarioId } });

  if (!etiqueta) {
    throw new AppError("Etiqueta no encontrada", 404);
  }

  await prisma.etiqueta.delete({ where: { id } });
};
