import { ValidatorFn } from '@angular/forms';
export const hoyLocal = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const fechaPasada: ValidatorFn = c => !c.value || !/^\d{4}-\d{2}-\d{2}$/.test(c.value) || c.value > hoyLocal() ? { fechaFutura: true } : null;
export const descripcionObligatoria: ValidatorFn = c => typeof c.value === 'string' && c.value.trim() ? null : { required: true };
export function enRango(fecha: string, rango: {desde: string | null; hasta: string | null}): boolean {
 const f = fecha.slice(0,10); return (!rango.desde || f >= rango.desde) && (!rango.hasta || f <= rango.hasta);
}
export function resumir(registros: {monto: number; categoriaId: string; categoria: {nombre: string; color: string}; tipo?: string}[]) {
 const mapa = new Map<string, {categoriaId: string; nombre: string; color: string; total: number}>();
 for (const r of registros.filter(r => r.tipo !== 'RETIRO')) {
  const c = mapa.get(r.categoriaId) ?? {categoriaId:r.categoriaId, nombre:r.categoria.nombre, color:r.categoria.color, total:0};
  c.total += Number(r.monto); mapa.set(r.categoriaId,c);
 }
 return [...mapa.values()];
}

export function coincideMovimiento(registro: { fecha: string; monto: number; descripcion?: string | null; categoria: { nombre: string } }, rango: { desde: string | null; hasta: string | null; texto?: string; minimo?: number | null; maximo?: number | null }): boolean {
 const texto = (rango.texto ?? '').trim().toLocaleLowerCase();
 return enRango(registro.fecha, rango)
   && (!texto || ((registro.descripcion ?? '') + ' ' + registro.categoria.nombre).toLocaleLowerCase().includes(texto))
   && (rango.minimo == null || Number(registro.monto) >= rango.minimo)
   && (rango.maximo == null || Number(registro.monto) <= rango.maximo);
}
