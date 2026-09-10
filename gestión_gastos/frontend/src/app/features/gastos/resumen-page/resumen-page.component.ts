import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { Ahorro } from '../ahorro-page/ahorro.models';
import { AhorroService } from '../ahorro-page/ahorro.service';
import { Gasto } from '../gastos-page/gasto.models';
import { GastoService } from '../gastos-page/gasto.service';
import { Ingreso } from '../../ingresos/models/ingreso.models';
import { IngresoService } from '../../ingresos/services/ingreso.service';

interface PuntoMes {
  label: string;
  gasto: number;
  ingreso: number;
}

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Pagina "Resumen": combina datos reales de los 3 modulos existentes
 * (gastos, ingresos, ahorro). Las secciones "Saldos por cuenta" y "Gastos
 * proximos" son de ejemplo por ahora -- no existe todavia un modulo de
 * "cuentas" ni de "presupuestos" en el backend.
 */
@Component({
  selector: 'app-resumen-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resumen-page.component.html',
  styleUrl: './resumen-page.component.scss',
})
export class ResumenPageComponent implements OnInit {
  readonly gastos = signal<Gasto[]>([]);
  readonly ingresos = signal<Ingreso[]>([]);
  readonly ahorros = signal<Ahorro[]>([]);
  readonly cargando = signal(true);

  // Ejemplo -- no hay modulo de cuentas todavia.
  readonly cuentasEjemplo = [
    { nombre: 'Cuenta 1', saldo: 1300 },
    { nombre: 'Cuenta 2', saldo: 1200 },
  ];

  // Ejemplo -- no hay modulo de presupuestos todavia.
  readonly gastosProximosEjemplo = [
    { nombre: 'Costo de comida', monto: 1300 },
    { nombre: 'Costo de salida', monto: 1200 },
  ];

  readonly mesCalendario = signal(new Date());
  readonly diasSemana = DIAS_SEMANA;

  readonly totalGastos = computed(() =>
    this.gastos().reduce((s, g) => s + Number(g.monto), 0)
  );

  readonly totalIngresos = computed(() =>
    this.ingresos().reduce((s, i) => s + Number(i.monto), 0)
  );

  readonly totalAhorros = computed(() =>
    this.ahorros().reduce(
      (s, a) => s + (a.tipo === 'RETIRO' ? -Number(a.monto) : Number(a.monto)),
      0
    )
  );

  readonly saldoTotal = computed(
    () => this.totalIngresos() - this.totalGastos() + this.totalAhorros()
  );

  readonly gastosDelMesPct = computed(() => {
    const ahora = new Date();
    const gastosMes = this.gastos()
      .filter((g) => {
        const f = new Date(g.fecha);
        return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
      })
      .reduce((s, g) => s + Number(g.monto), 0);

    const ingresosMes = this.ingresos()
      .filter((i) => {
        const f = new Date(i.fecha);
        return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
      })
      .reduce((s, i) => s + Number(i.monto), 0);

    if (ingresosMes === 0) return 0;
    return Math.min(100, Math.round((gastosMes / ingresosMes) * 100));
  });

  readonly datosPorMes = computed<PuntoMes[]>(() => {
    const mapa = new Map<string, { gasto: number; ingreso: number }>();

    const acumular = (fechaStr: string, campo: 'gasto' | 'ingreso', monto: number) => {
      const f = new Date(fechaStr);
      const clave = `${f.getFullYear()}-${f.getMonth()}`;
      const actual = mapa.get(clave) ?? { gasto: 0, ingreso: 0 };
      actual[campo] += monto;
      mapa.set(clave, actual);
    };

    this.gastos().forEach((g) => acumular(g.fecha, 'gasto', Number(g.monto)));
    this.ingresos().forEach((i) => acumular(i.fecha, 'ingreso', Number(i.monto)));

    return Array.from(mapa.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .slice(-6)
      .map(([clave, val]) => {
        const mes = Number(clave.split('-')[1]);
        return { label: NOMBRES_MES[mes].slice(0, 3), ...val };
      });
  });

  readonly maxValorMes = computed(() => {
    const valores = this.datosPorMes().flatMap((p) => [p.gasto, p.ingreso]);
    return Math.max(...valores, 1);
  });

  readonly diasCalendario = computed(() => {
    const fecha = this.mesCalendario();
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth();
    const primerDia = new Date(anio, mes, 1);
    // getDay(): 0=domingo..6=sabado -> convertimos a que la semana empiece en lunes
    const offset = (primerDia.getDay() + 6) % 7;
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();

    const celdas: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= diasEnMes; d++) celdas.push(d);
    return celdas;
  });

  readonly nombreMesCalendario = computed(() =>
    NOMBRES_MES[this.mesCalendario().getMonth()].toUpperCase()
  );

  readonly esHoy = (dia: number | null): boolean => {
    if (!dia) return false;
    const hoy = new Date();
    const m = this.mesCalendario();
    return (
      dia === hoy.getDate() &&
      m.getMonth() === hoy.getMonth() &&
      m.getFullYear() === hoy.getFullYear()
    );
  };

  constructor(
    private readonly gastoService: GastoService,
    private readonly ingresoService: IngresoService,
    private readonly ahorroService: AhorroService
  ) {}

  ngOnInit(): void {
    this.gastoService.listar().subscribe({ next: (g) => this.gastos.set(g) });
    this.ingresoService.listar().subscribe({ next: (i) => this.ingresos.set(i) });
    this.ahorroService.listar().subscribe({
      next: (a) => {
        this.ahorros.set(a);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  mesAnterior(): void {
    const f = this.mesCalendario();
    this.mesCalendario.set(new Date(f.getFullYear(), f.getMonth() - 1, 1));
  }

  mesSiguiente(): void {
    const f = this.mesCalendario();
    this.mesCalendario.set(new Date(f.getFullYear(), f.getMonth() + 1, 1));
  }

  alturaBarra(valor: number): number {
    return (valor / this.maxValorMes()) * 160;
  }

  yBarra(valor: number): number {
    return 200 - this.alturaBarra(valor);
  }
}
