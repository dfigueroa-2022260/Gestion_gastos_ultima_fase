import { z } from "zod";
import { montoRegistro, descripcionRegistro, fechaRegistro } from "../../utils/registro.schema";

export const gastoSchema = z.object({
  monto: montoRegistro,
  descripcion: descripcionRegistro,
  fecha: fechaRegistro.optional(),
  categoriaId: z.string().uuid("Categoria invalida"),
});

export type GastoInput = z.infer<typeof gastoSchema>;
