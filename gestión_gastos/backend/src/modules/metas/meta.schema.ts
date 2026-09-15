import { montoRegistro } from '../../utils/registro.schema';
import { z } from "zod";

export const metaSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  montoObjetivo: montoRegistro,
  montoActual: z.number().finite().min(0).max(99999999.99).optional(),
  fechaCumplimiento: z.coerce.date().optional(),
  prioridad: z.enum(["ALTA", "MEDIA", "BAJA"]).optional(),
  automatizarAhorro: z.boolean().optional(),
  icono: z.string().optional(),
});

export type MetaInput = z.infer<typeof metaSchema>;
