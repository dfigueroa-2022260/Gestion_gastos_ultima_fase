import { z } from "zod";
export const montoRegistro = z.number().finite().min(0.01, "El monto debe ser mayor a 0").max(99999999.99, "El monto es demasiado grande");
export const descripcionRegistro = z.string().trim().min(1, "La descripción es obligatoria");
export const fechaRegistro = z.coerce.date().refine(fecha => {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' });
  return fecha.toISOString().slice(0, 10) <= hoy;
}, "No puedes registrar movimientos en una fecha futura");
