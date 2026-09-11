import { z } from "zod";

export const metaSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  montoObjetivo: z.number().positive("El monto objetivo debe ser mayor a 0"),
  montoActual: z.number().min(0).optional(),
  fechaCumplimiento: z.coerce.date().optional(),
  prioridad: z.enum(["ALTA", "MEDIA", "BAJA"]).optional(),
  automatizarAhorro: z.boolean().optional(),
  icono: z.string().optional(),
});

export type MetaInput = z.infer<typeof metaSchema>;
