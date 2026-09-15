import { CategoryDonutComponent } from '../../../shared/category-donut/category-donut.component';
import { coincideMovimiento, resumir } from '../../../shared/registro.utils';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { PerfilPanelService } from '../../../core/services/perfil-panel.service';
import { TopFiltersComponent, RangoFechas } from '../../../shared/top-filters/top-filters.component';
import { AuthService } from '../../auth/services/auth.service';
import { Ingreso } from '../../ingresos/models/ingreso.models';
import { IngresoService } from '../../ingresos/services/ingreso.service';
import { Ahorro } from '../ahorro-page/ahorro.models';
import { AhorroService } from '../ahorro-page/ahorro.service';
import { Gasto, ResumenCategoria } from '../gastos-page/gasto.models';
import { GastoService } from '../gastos-page/gasto.service';
import { Meta } from '../metas-page/meta.models';
import { MetaService } from '../metas-page/meta.service';

interface PuntoMes {
  label: string;
  gasto: number;
  ingreso: number;
}

const NOMBRES_MES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];


/**
 * Pagina "Home": conectada a los datos reales de gastos, ingresos, ahorro
 * y metas. Los filtros permiten buscar movimientos por texto, importe y fecha; "Consejos de Finanzas"
 * genera una recomendacion corta a partir de esos mismos datos.
 */
@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CategoryDonutComponent, CommonModule, TopFiltersComponent],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.scss',
})
export class DashboardOverviewComponent implements OnInit {
  private readonly gastosSinFiltrar = signal<Gasto[]>([]);
  private readonly ingresosSinFiltrar = signal<Ingreso[]>([]);
  private readonly ahorrosSinFiltrar = signal<Ahorro[]>([]);
  readonly resumenGastos = computed(() => resumir(this.gastos()));
  readonly metas = signal<Meta[]>([]);
  readonly cargando = signal(true);

  readonly rango = signal<RangoFechas>({ desde: null, hasta: null, etiqueta: 'Todo' });
  readonly consejoAbierto = signal(false);

  readonly gastos = computed(() =>
    this.gastosSinFiltrar().filter((g) => coincideMovimiento(g, this.rango()))
  );
  readonly ingresos = computed(() =>
    this.ingresosSinFiltrar().filter((i) => coincideMovimiento(i, this.rango()))
  );
  readonly ahorros = computed(() =>
    this.ahorrosSinFiltrar().filter((a) => coincideMovimiento(a, this.rango()))
  );

  readonly totalGastos = computed(() => this.gastos().reduce((s, g) => s + Number(g.monto), 0));
  readonly totalIngresos = computed(() => this.ingresos().reduce((s, i) => s + Number(i.monto), 0));
  readonly totalAhorros = computed(() =>
    this.ahorros().reduce((s, a) => s + (a.tipo === 'RETIRO' ? -Number(a.monto) : Number(a.monto)), 0)
  );
  readonly saldo = computed(() => this.totalIngresos() - this.totalGastos());

  readonly gastosDelMesPct = computed(() => {
    if (this.totalIngresos() === 0) return 0;
    return Math.min(100, Math.round((this.totalGastos() / this.totalIngresos()) * 100));
  });

  readonly metasResumen = computed(() => {
    const activas = this.metas();
    if (!activas.length) return { cantidad: 0, promedio: 0 };
    const promedio = Math.round(
      activas.reduce((s, m) => s + Math.min(100, (Number(m.montoActual) / Number(m.montoObjetivo)) * 100), 0) /
        activas.length
    );
    return { cantidad: activas.length, promedio };
  });

  readonly mesesGrafica = computed(() => {
    const fechas = [...this.gastos(), ...this.ingresos()].map(g => g.fecha.slice(0, 7)).sort();
    if (!fechas.length) return [];
    const fin = new Date(fechas[fechas.length - 1] + '-01T12:00:00');
    return Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(fin.getFullYear(), fin.getMonth() - 6 + i, 1);
      return { clave: fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0'), label: fecha.toLocaleDateString('es', { month: 'short' }), completo: fecha.toLocaleDateString('es', { month: 'long', year: 'numeric' }) };
    });
  });
  readonly seriesMovimientos = computed(() => {
    const meses = this.mesesGrafica();
    if (!meses.length) return [];
    return [
      { nombre: 'Gastos', color: '#201f1d', registros: this.gastos() },
      { nombre: 'Ingresos', color: '#ff8b4c', registros: this.ingresos() }
    ].map(serie => ({ nombre: serie.nombre, color: serie.color,
      valores: meses.map(m => serie.registros.filter(r => r.fecha.startsWith(m.clave)).reduce((total, r) => total + Number(r.monto), 0))
    }));
  });
  readonly maxValorMes = computed(() => {
    const max = Math.max(1, ...this.seriesMovimientos().flatMap(s => s.valores));
    const paso = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / paso) * paso;
  });
  readonly resumenIngresos = computed(() => resumir(this.ingresos()).sort((a, b) => b.total - a.total));
  readonly ingresoSeleccionado = signal<string | null>(null);
  readonly ingresoDetalle = computed(() => this.resumenIngresos().find(c => c.categoriaId === this.ingresoSeleccionado()) ?? null);
  seleccionarIngreso(id: string): void { this.ingresoSeleccionado.update(actual => actual === id ? null : id); }
  colorIngreso(index: number): string { return ['#ff8b4c', '#d96a32', '#f2dfcc', '#816b5b', '#b8967d', '#caaa8b'][index % 6]; }

  readonly consejo = computed(() => {
    const pct = this.gastosDelMesPct();
    const topCategoria = [...this.resumenGastos()].sort((a, b) => Number(b.total) - Number(a.total))[0];

    if (this.totalIngresos() === 0 && this.totalGastos() === 0) {
      return 'Todavia no hay suficientes movimientos registrados para darte un consejo. Registra tus gastos e ingresos para empezar.';
    }
    if (pct >= 90) {
      return `Estas usando el ${pct}% de tus ingresos en gastos${topCategoria ? ', sobre todo en ' + topCategoria.nombre : ''}. Es un buen momento para revisar ese gasto antes de que crezca mas.`;
    }
    if (pct >= 60) {
      return `Vas usando el ${pct}% de tus ingresos en gastos. Todavia tenes margen, pero conviene vigilar${topCategoria ? ' ' + topCategoria.nombre : ' tus categorias principales'} de cerca.`;
    }
    return `Vas bien: solo el ${pct}% de tus ingresos se fue en gastos en este periodo. Es un buen momento para reforzar tus metas de ahorro.`;
  });

  constructor(
    public readonly authService: AuthService,
    public readonly perfilPanel: PerfilPanelService,
    private readonly gastoService: GastoService,
    private readonly ingresoService: IngresoService,
    private readonly ahorroService: AhorroService,
    private readonly metaService: MetaService
  ) {}

  ngOnInit(): void {
    this.gastoService.listar().subscribe({ next: (g) => this.gastosSinFiltrar.set(g) });
    this.ingresoService.listar().subscribe({ next: (i) => this.ingresosSinFiltrar.set(i) });
    this.ahorroService.listar().subscribe({
      next: (a) => {
        this.ahorrosSinFiltrar.set(a);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
    this.metaService.listar().subscribe({ next: (m) => this.metas.set(m) });
  }

  onRango(r: RangoFechas): void {
    this.rango.set(r);
  }

  toggleConsejo(): void {
    this.consejoAbierto.update((v) => !v);
  }

  xPunto(index: number): number { return 55 + index * 62; }
  yPunto(valor: number): number { return 185 - valor / this.maxValorMes() * 155; }
  puntosLinea(valores: number[]): string { return valores.map((valor, i) => this.xPunto(i) + ',' + this.yPunto(valor)).join(' '); }
  donutLargo(total: number): number { return this.totalIngresos() > 0 ? total / this.totalIngresos() * 2 * Math.PI * 48 : 0; }
  donutOffset(index: number): number { return -this.donutLargo(this.resumenIngresos().slice(0, index).reduce((total, c) => total + c.total, 0)); }
}
