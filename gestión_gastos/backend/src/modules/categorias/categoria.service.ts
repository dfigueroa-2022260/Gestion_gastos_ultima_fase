import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { CategoriaInput } from "./categoria.schema";

// Devuelve TODAS las categorias del usuario (principales y subcategorias);
// el frontend las separa segun categoriaPadreId.
export const listarCategorias = (usuarioId: string) => {
  return prisma.categoria.findMany({
    where: { usuarioId },
    orderBy: { nombre: "asc" },
  });
};

export const crearCategoria = async (
  usuarioId: string,
  data: CategoriaInput
) => {
  const existente = await prisma.categoria.findFirst({
    where: { usuarioId, nombre: data.nombre },
  });

  if (existente) {
    throw new AppError("Ya tienes una categoria con ese nombre", 409);
  }

  if (data.categoriaPadreId) {
    const padre = await prisma.categoria.findFirst({
      where: { id: data.categoriaPadreId, usuarioId },
    });
    if (!padre) {
      throw new AppError("La categoria principal no existe", 404);
    }
  }

  return prisma.categoria.create({
    data: { ...data, usuarioId },
  });
};

export const actualizarCategoria = async (
  usuarioId: string,
  id: string,
  data: CategoriaInput
) => {
  const categoria = await prisma.categoria.findFirst({
    where: { id, usuarioId },
  });

  if (!categoria) {
    throw new AppError("Categoria no encontrada", 404);
  }

  return prisma.categoria.update({ where: { id }, data });
};

export const eliminarCategoria = async (usuarioId: string, id: string) => {
  const categoria = await prisma.categoria.findFirst({
    where: { id, usuarioId },
  });

  if (!categoria) {
    throw new AppError("Categoria no encontrada", 404);
  }

  await prisma.categoria.delete({ where: { id } });
};
