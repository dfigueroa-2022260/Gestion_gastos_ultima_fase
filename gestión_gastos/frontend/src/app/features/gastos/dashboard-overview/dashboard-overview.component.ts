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

const enRango = (fechaStr: string, desde: string | null, hasta: string | null): boolean => {
  const f = fechaStr.slice(0, 10);
  if (desde && f < desde) return false;
  if (hasta && f > hasta) return false;
  return true;
};

/**
 * Pagina "Home": conectada a los datos reales de gastos, ingresos, ahorro
 * y metas. Filter/Calendario filtran por fecha; "Consejos de Finanzas"
 * genera una recomendacion corta a partir de esos mismos datos.
 */
@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule, TopFiltersComponent],
  templateUrl: './dashboard-overview.component.html',
  styleUrl: './dashboard-overview.component.scss',
})
export class DashboardOverviewComponent implements OnInit {
  private readonly gastosSinFiltrar = signal<Gasto[]>([]);
  private readonly ingresosSinFiltrar = signal<Ingreso[]>([]);
  private readonly ahorrosSinFiltrar = signal<Ahorro[]>([]);
  readonly resumenGastos = signal<ResumenCategoria[]>([]);
  readonly metas = signal<Meta[]>([]);
  readonly cargando = signal(true);

  readonly rango = signal<RangoFechas>({ desde: null, hasta: null, etiqueta: 'Todo' });
  readonly consejoAbierto = signal(false);

  readonly gastos = computed(() =>
    this.gastosSinFiltrar().filter((g) => enRango(g.fecha, this.rango().desde, this.rango().hasta))
  );
  readonly ingresos = computed(() =>
    this.ingresosSinFiltrar().filter((i) => enRango(i.fecha, this.rango().desde, this.rango().hasta))
  );
  readonly ahorros = computed(() =>
    this.ahorrosSinFiltrar().filter((a) => enRango(a.fecha, this.rango().desde, this.rango().hasta))
  );

  readonly totalGastos = computed(() => this.gastos().reduce((s, g) => s + Number(g.monto), 0));
  readonly totalIngresos = computed(() => this.ingresos().reduce((s, i) => s + Number(i.monto), 0));
  readonly totalAhorros = computed(() =>
    this.ahorros().reduce((s, a) => s + (a.tipo === 'RETIRO' ? -Number(a.monto) : Number(a.monto)), 0)
  );
  readonly saldo = computed(() => this.totalIngresos() - this.totalGastos() + this.totalAhorros());

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
      .slice(-7)
      .map(([clave, val]) => {
        const mes = Number(clave.split('-')[1]);
        return { label: NOMBRES_MES[mes], ...val };
      });
  });

  readonly maxValorMes = computed(() => {
    const valores = this.datosPorMes().flatMap((p) => [p.gasto, p.ingreso]);
    return Math.max(...valores, 1);
  });

  readonly totalResumenCategorias = computed(() =>
    this.resumenGastos().reduce((s, r) => s + Number(r.total), 0)
  );

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
    this.gastoService.resumen().subscribe({ next: (r) => this.resumenGastos.set(r) });
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

  alturaBarra(valor: number): number {
    return (valor / this.maxValorMes()) * 160;
  }

  yBarra(valor: number): number {
    return 190 - this.alturaBarra(valor);
  }

  donutLargo(total: number): number {
    const circunferencia = 251;
    const pct = this.totalResumenCategorias() > 0 ? (Number(total) / this.totalResumenCategorias()) * 100 : 0;
    return (pct / 100) * circunferencia;
  }

  donutOffset(index: number): number {
    const circunferencia = 251;
    const acumulado = this.resumenGastos().slice(0, index).reduce((s, r) => s + Number(r.total), 0);
    const pct = this.totalResumenCategorias() > 0 ? (acumulado / this.totalResumenCategorias()) * 100 : 0;
    return circunferencia - (pct / 100) * circunferencia;
  }
}
