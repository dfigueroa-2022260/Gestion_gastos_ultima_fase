import { z } from "zod";
import { montoRegistro, descripcionRegistro, fechaRegistro } from "../../utils/registro.schema";

export const ahorroSchema = z.object({
  monto: montoRegistro,
  descripcion: descripcionRegistro,
  fecha: fechaRegistro.optional(),
  tipo: z.enum(["DEPOSITO", "RETIRO"]).optional(),
  categoriaId: z.string().uuid("Categoria invalida"),
});

export type AhorroInput = z.infer<typeof ahorroSchema>;
