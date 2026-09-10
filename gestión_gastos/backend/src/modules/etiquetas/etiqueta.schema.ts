import { z } from "zod";

export const etiquetaSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  color: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6})$/, "El color debe ser un hexadecimal valido")
    .optional(),
  icono: z.string().optional(),
  etiquetaPadreId: z.string().uuid().nullable().optional(),
});

export type EtiquetaInput = z.infer<typeof etiquetaSchema>;
