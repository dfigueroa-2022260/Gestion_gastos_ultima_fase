import { z } from "zod";

export const ahorroSchema = z.object({
  monto: z.number().positive("El monto debe ser mayor a 0"),
  descripcion: z.string().optional(),
  fecha: z.coerce.date().optional(),
  tipo: z.enum(["DEPOSITO", "RETIRO"]).optional(),
  categoriaId: z.string().uuid("Categoria invalida"),
});

export type AhorroInput = z.infer<typeof ahorroSchema>;
