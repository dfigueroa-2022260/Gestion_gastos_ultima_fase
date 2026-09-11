import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { Ahorro } from '../ahorro-page/ahorro.models';
import { AhorroService } from '../ahorro-page/ahorro.service';
import { Gasto, ResumenCategoria } from '../gastos-page/gasto.models';
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

/**
 * Pagina "Reportes": no tiene backend propio, recombina en una nueva
 * vista los datos reales que ya exponen gastos, ingresos y ahorro.
 */
@Component({
  selector: 'app-reportes-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reportes-page.component.html',
  styleUrl: './reportes-page.component.scss',
})
export class ReportesPageComponent implements OnInit {
  readonly gastos = signal<Gasto[]>([]);
  readonly ingresos = signal<Ingreso[]>([]);
  readonly ahorros = signal<Ahorro[]>([]);
  readonly resumenGastos = signal<ResumenCategoria[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

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

  readonly totalResumen = computed(() =>
    this.resumenGastos().reduce((s, r) => s + Number(r.total), 0)
  );

  readonly topCategorias = computed(() =>
    [...this.resumenGastos()].sort((a, b) => Number(b.total) - Number(a.total)).slice(0, 2)
  );

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

  constructor(
    private readonly gastoService: GastoService,
    private readonly ingresoService: IngresoService,
    private readonly ahorroService: AhorroService
  ) {}

  ngOnInit(): void {
    this.gastoService.listar().subscribe({
      next: (g) => this.gastos.set(g),
      error: () => this.error.set('No se pudieron cargar todos los datos.'),
    });
    this.gastoService.resumen().subscribe({ next: (r) => this.resumenGastos.set(r) });
    this.ingresoService.listar().subscribe({ next: (i) => this.ingresos.set(i) });
    this.ahorroService.listar().subscribe({
      next: (a) => {
        this.ahorros.set(a);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  alturaBarra(valor: number): number {
    return (valor / this.maxValorMes()) * 160;
  }

  yBarra(valor: number): number {
    return 200 - this.alturaBarra(valor);
  }

  donutLargo(total: number): number {
    const circunferencia = 176; // 2 * PI * 28 (radio usado en el template)
    const pct = this.totalResumen() > 0 ? (Number(total) / this.totalResumen()) * 100 : 0;
    return (pct / 100) * circunferencia;
  }

  donutOffset(index: number): number {
    const circunferencia = 176;
    const acumulado = this.resumenGastos()
      .slice(0, index)
      .reduce((s, r) => s + Number(r.total), 0);
    const pct = this.totalResumen() > 0 ? (acumulado / this.totalResumen()) * 100 : 0;
    return circunferencia - (pct / 100) * circunferencia;
  }
}
