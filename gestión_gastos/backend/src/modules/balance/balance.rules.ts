export interface MovimientoSaldo {
  fecha: string;
  monto: number;
  tipo: 'INGRESO' | 'GASTO' | 'DEPOSITO' | 'RETIRO';
}
export interface LibroSaldo { inicial: number; movimientos: MovimientoSaldo[]; }

/** Integer cents avoid rounding differences at the zero-balance boundary. */
export function recorrido(libro: LibroSaldo, fechas: string[]) {
  const cambios = new Map<string, { disponible: number; ahorro: number }>();
  for (const m of libro.movimientos) {
    const cambio = cambios.get(m.fecha) ?? { disponible: 0, ahorro: 0 };
    const centavos = Math.round(m.monto * 100);
    cambio.disponible += ['INGRESO', 'RETIRO'].includes(m.tipo) ? centavos : -centavos;
    cambio.ahorro += m.tipo === 'DEPOSITO' ? centavos : m.tipo === 'RETIRO' ? -centavos : 0;
    cambios.set(m.fecha, cambio);
  }
  let disponible = Math.round(libro.inicial * 100), ahorro = 0;
  return fechas.map(fecha => {
    const cambio = cambios.get(fecha);
    disponible += cambio?.disponible ?? 0;
    ahorro += cambio?.ahorro ?? 0;
    return { fecha, disponible, ahorro };
  });
}

/** Existing invalid history can be corrected, but never made worse. */
export function problemaSaldo(antes: LibroSaldo, despues: LibroSaldo): string | null {
  const fechas = [...new Set(['0000-00-00', ...antes.movimientos.map(m => m.fecha), ...despues.movimientos.map(m => m.fecha)])].sort();
  const previo = recorrido(antes, fechas), nuevo = recorrido(despues, fechas);
  for (let i = 0; i < fechas.length; i++) {
    for (const campo of ['disponible', 'ahorro'] as const) {
      if (nuevo[i][campo] < Math.min(0, previo[i][campo])) {
        return `La operación dejaría ${campo === 'ahorro' ? 'el ahorro' : 'el saldo disponible'} en negativo el ${fechas[i]}. Faltan Q${(-nuevo[i][campo] / 100).toFixed(2)}. Revisa el monto y la fecha.`;
      }
    }
  }
  return null;
}

export function resumenSaldo(libro: LibroSaldo) {
  const fechas = [...new Set(['0000-00-00', ...libro.movimientos.map(m => m.fecha)])].sort();
  const estados = recorrido(libro, fechas);
  const ultimo = estados[estados.length - 1];
  return {
    disponible: Math.max(0, ultimo.disponible) / 100,
    ahorro: Math.max(0, ultimo.ahorro) / 100,
    deficitDisponible: Math.max(0, -ultimo.disponible) / 100,
    deficitAhorro: Math.max(0, -ultimo.ahorro) / 100,
  };
}
