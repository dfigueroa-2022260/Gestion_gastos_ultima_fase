import { z } from "zod";
import { montoRegistro, descripcionRegistro, fechaRegistro } from "../../utils/registro.schema";

export const ingresoSchema = z.object({
  monto: montoRegistro,
  descripcion: descripcionRegistro,
  fecha: fechaRegistro.optional(),
  categoriaId: z.string().uuid("Categoria invalida"),
});

export type IngresoInput = z.infer<typeof ingresoSchema>;
