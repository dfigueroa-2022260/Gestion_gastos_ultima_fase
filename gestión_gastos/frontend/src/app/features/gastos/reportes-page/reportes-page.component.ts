import { CategoryDonutComponent } from '../../../shared/category-donut/category-donut.component';
import { BarChartComponent } from '../../../shared/bar-chart/bar-chart.component';
import { FormsModule } from '@angular/forms';
import { TopFiltersComponent, RangoFechas } from '../../../shared/top-filters/top-filters.component';
import { enRango, resumir } from '../../../shared/registro.utils';
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
  ahorro: number;
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
  imports: [CategoryDonutComponent, BarChartComponent, FormsModule, TopFiltersComponent, CommonModule],
  templateUrl: './reportes-page.component.html',
  styleUrl: './reportes-page.component.scss',
})
export class ReportesPageComponent implements OnInit {
  readonly datosBarras = computed(() => this.datosPorMes().map(p => ({label: p.label, valores: [p.ingreso, p.gasto, p.ahorro]})));
  readonly filtrosAbiertos = signal(false);
  readonly tipo = signal('todos');
  readonly categoria = signal('');
  readonly busqueda = signal('');
  readonly minimo = signal<number | null>(null);
  readonly maximo = signal<number | null>(null);
  readonly categoriasFiltro = computed(() => Array.from(new Map([...this.gastosTodos(), ...this.ingresosTodos(), ...this.ahorrosTodos()].map(r => [r.categoriaId, r.categoria])).values()).sort((a,b) => a.nombre.localeCompare(b.nombre)));
  readonly rangoMontoInvalido = computed(() => this.minimo() !== null && this.maximo() !== null && this.minimo()! > this.maximo()!);
  readonly filtrosActivos = computed(() => this.tipo() !== 'todos' || !!this.categoria() || !!this.busqueda() || this.minimo() !== null || this.maximo() !== null);
  limpiarFiltros(): void { this.tipo.set('todos'); this.categoria.set(''); this.busqueda.set(''); this.minimo.set(null); this.maximo.set(null); }
  coincide(r: Gasto | Ingreso | Ahorro, tipo: string): boolean {
    return !this.rangoMontoInvalido() && enRango(r.fecha, this.rango()) && (this.tipo() === 'todos' || this.tipo() === tipo)
      && (!this.categoria() || r.categoriaId === this.categoria())
      && (!this.busqueda().trim() || (r.descripcion ?? '').toLocaleLowerCase().includes(this.busqueda().trim().toLocaleLowerCase()))
      && (this.minimo() === null || Number(r.monto) >= this.minimo()!) && (this.maximo() === null || Number(r.monto) <= this.maximo()!);
  }
  readonly rango = signal<RangoFechas>({desde:null,hasta:null,etiqueta:'Todo'});
  onRango(r: RangoFechas): void { this.rango.set(r); }
  private readonly gastosTodos = signal<Gasto[]>([]);
  readonly gastos = computed(() => this.gastosTodos().filter(r => this.coincide(r, 'gastos')));
  private readonly ingresosTodos = signal<Ingreso[]>([]);
  readonly ingresos = computed(() => this.ingresosTodos().filter(r => this.coincide(r, 'ingresos')));
  private readonly ahorrosTodos = signal<Ahorro[]>([]);
  readonly ahorros = computed(() => this.ahorrosTodos().filter(r => this.coincide(r, 'ahorros')));
  readonly resumenGastos = computed(() => resumir(this.gastos()));
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
    const mapa = new Map<string, { gasto: number; ingreso: number; ahorro: number }>();

    const acumular = (fechaStr: string, campo: 'gasto' | 'ingreso' | 'ahorro', monto: number) => {
      const f = new Date(fechaStr.slice(0, 10) + 'T12:00:00');
      const clave = `${f.getFullYear()}-${String(f.getMonth()).padStart(2, '0')}`;
      const actual = mapa.get(clave) ?? { gasto: 0, ingreso: 0, ahorro: 0 };
      actual[campo] += monto;
      mapa.set(clave, actual);
    };

    this.gastos().forEach((g) => acumular(g.fecha, 'gasto', Number(g.monto)));
    this.ingresos().forEach((i) => acumular(i.fecha, 'ingreso', Number(i.monto)));
    this.ahorros().forEach(a => acumular(a.fecha, 'ahorro', Number(a.monto) * (a.tipo === 'RETIRO' ? -1 : 1)));

    return Array.from(mapa.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([clave, val]) => {
        const mes = Number(clave.split('-')[1]);
        return { label: NOMBRES_MES[mes].slice(0, 3) + " " + clave.slice(2,4), ...val };
      });
  });

  readonly maxValorMes = computed(() => {
    const valores = this.datosPorMes().flatMap((p) => [p.gasto, p.ingreso, p.ahorro]);
    return Math.max(...valores, 1);
  });

  constructor(
    private readonly gastoService: GastoService,
    private readonly ingresoService: IngresoService,
    private readonly ahorroService: AhorroService
  ) {}

  ngOnInit(): void {
    this.gastoService.listar().subscribe({
      next: (g) => this.gastosTodos.set(g),
      error: () => this.error.set('No se pudieron cargar todos los datos.'),
    });
    this.ingresoService.listar().subscribe({ next: (i) => this.ingresosTodos.set(i), error: () => this.error.set('No se pudieron cargar los ingresos.') });
    this.ahorroService.listar().subscribe({
      next: (a) => {
        this.ahorrosTodos.set(a);
        this.cargando.set(false);
      },
      error: () => { this.cargando.set(false); this.error.set('No se pudieron cargar los ahorros.'); },
    });
  }

  readonly minValorMes = computed(() => Math.min(0, ...this.datosPorMes().map(p => p.ahorro)));
  yValor(valor: number): number { return 200 - (valor - this.minValorMes()) / (this.maxValorMes() - this.minValorMes()) * 160; }
  alturaBarra(valor: number): number { return Math.abs(this.yValor(valor) - this.yValor(0)); }
  yBarra(valor: number): number { return Math.min(this.yValor(valor), this.yValor(0)); }

  donutLargo(total: number): number {
    const circunferencia = 2 * Math.PI * 28; // 2 * PI * 28 (radio usado en el template)
    const pct = this.totalResumen() > 0 ? (Number(total) / this.totalResumen()) * 100 : 0;
    return (pct / 100) * circunferencia;
  }

  donutOffset(index: number): number {
    const circunferencia = 2 * Math.PI * 28;
    const acumulado = this.resumenGastos()
      .slice(0, index)
      .reduce((s, r) => s + Number(r.total), 0);
    const pct = this.totalResumen() > 0 ? (acumulado / this.totalResumen()) * 100 : 0;
    return -(pct / 100) * circunferencia;
  }
}
