import { z } from "zod";

export const categoriaSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  color: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/, "El color debe ser un hexadecimal valido")
    .optional(),
  icono: z.string().optional(),
  categoriaPadreId: z.string().uuid().nullable().optional(),
});

export type CategoriaInput = z.infer<typeof categoriaSchema>;
