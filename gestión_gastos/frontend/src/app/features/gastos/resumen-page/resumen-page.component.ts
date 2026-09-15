import { BarChartComponent } from '../../../shared/bar-chart/bar-chart.component';
import { forkJoin, catchError, of, finalize } from 'rxjs';
import { inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Plan, PlanService } from './plan.service';
import { DialogService } from '../../../shared/dialog.service';
import { hoyLocal } from '../../../shared/registro.utils';
import { TopFiltersComponent, RangoFechas } from '../../../shared/top-filters/top-filters.component';
import { coincideMovimiento, enRango } from '../../../shared/registro.utils';
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

/** Resumen de movimientos, cuentas y planificación mensual del usuario. */
@Component({
  selector: 'app-resumen-page',
  standalone: true,
  imports: [BarChartComponent, FormsModule, TopFiltersComponent, CommonModule],
  templateUrl: './resumen-page.component.html',
  styleUrl: './resumen-page.component.scss',
})
export class ResumenPageComponent implements OnInit {
  readonly datosBarras = computed(() => this.datosPorMes().map(p => ({label: p.label, valores: [p.ingreso, p.gasto]})));
  readonly rango = signal<RangoFechas>({desde:null,hasta:null,etiqueta:'Todo'});
  onRango(r: RangoFechas): void { this.rango.set(r); }
  private readonly gastosTodos = signal<Gasto[]>([]);
  readonly gastos = computed(() => this.gastosTodos().filter(r => coincideMovimiento(r, this.rango())));
  private readonly ingresosTodos = signal<Ingreso[]>([]);
  readonly ingresos = computed(() => this.ingresosTodos().filter(r => coincideMovimiento(r, this.rango())));
  private readonly ahorrosTodos = signal<Ahorro[]>([]);
  readonly ahorros = computed(() => this.ahorrosTodos().filter(r => coincideMovimiento(r, this.rango())));
  readonly cargando = signal(true);

  readonly planService = inject(PlanService);
  readonly dialog = inject(DialogService);
  readonly planes = signal<Plan[]>([]);
  readonly cuentas = computed(() => this.planes().filter(p=>p.tipo==='CUENTA'));
  readonly proximos = computed(() => this.planes().filter(p=>p.tipo==='PROXIMO' && enRango(p.fecha!,this.rango())));
  readonly presupuestos = computed(() => this.planes().filter(p=>p.tipo==='PRESUPUESTO' && enRango(p.fecha!,this.rango())));
  readonly error = signal('');
  readonly guardandoPlan = signal(false);
  readonly tipoPlan = signal<Plan['tipo'] | null>(null);
  nombrePlan=''; montoPlan:number|null=null; fechaPlan='';
  abrirPlan(tipo:Plan['tipo']):void {this.tipoPlan.set(tipo);this.nombrePlan='';this.montoPlan=null;this.fechaPlan=hoyLocal();this.error.set('');}
  guardarPlan():void {
    if(this.guardandoPlan()) return;
    const tipo=this.tipoPlan(); const monto=Number(this.montoPlan);
    if(!tipo || !this.nombrePlan.trim() || !Number.isFinite(monto) || monto<0.01 || monto>99999999.99 || (tipo!=='CUENTA' && !this.fechaPlan)) {this.error.set('Ingresa una descripción, un monto mayor a 0 y la fecha del plan.');return;}
    this.error.set('');
    this.guardandoPlan.set(true);
    this.planService.crear({tipo,nombre:this.nombrePlan.trim(),monto,fecha:tipo==='CUENTA'?undefined:this.fechaPlan}).subscribe({next:p=>{this.planes.update(a=>[p,...a]);this.tipoPlan.set(null);this.guardandoPlan.set(false);},error:e=>{this.error.set(e?.error?.error ?? 'No se pudo guardar el plan.');this.guardandoPlan.set(false);}});
  }
  async eliminarPlan(p:Plan):Promise<void>{if(!await this.dialog.confirm('¿Eliminar '+p.nombre+'?'))return;this.planService.eliminar(p.id).subscribe({next:()=>this.planes.update(a=>a.filter(x=>x.id!==p.id)),error:()=>this.error.set('No se pudo eliminar el plan.')});}
  gastoPresupuesto(p:Plan):number {return this.gastosTodos().filter(g=>g.fecha.slice(0,7)===p.fecha?.slice(0,7)).reduce((s,g)=>s+Number(g.monto),0);}
  seleccionarDia(dia:number|null):void {if(!dia)return;const f=hoyLocal(new Date(this.mesCalendario().getFullYear(),this.mesCalendario().getMonth(),dia));this.onRango({desde:f,hasta:f,etiqueta:f});}
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
    () => this.totalIngresos() - this.totalGastos()
  );

  readonly gastosDelMesPct = computed(() => this.totalIngresos() > 0 ? Math.round(this.totalGastos() / this.totalIngresos() * 100) : 0);
  diaSeleccionado(dia: number | null): boolean {
    if (!dia) return false;
    const fecha = hoyLocal(new Date(this.mesCalendario().getFullYear(), this.mesCalendario().getMonth(), dia));
    return this.rango().desde === fecha && this.rango().hasta === fecha;
  }

  readonly datosPorMes = computed<PuntoMes[]>(() => {
    const mapa = new Map<string, { gasto: number; ingreso: number }>();

    const acumular = (fechaStr: string, campo: 'gasto' | 'ingreso', monto: number) => {
      const f = new Date(fechaStr.slice(0, 10) + 'T12:00:00');
      const clave = `${f.getFullYear()}-${String(f.getMonth()).padStart(2, '0')}`;
      const actual = mapa.get(clave) ?? { gasto: 0, ingreso: 0 };
      actual[campo] += monto;
      mapa.set(clave, actual);
    };

    this.gastos().forEach((g) => acumular(g.fecha, 'gasto', Number(g.monto)));
    this.ingresos().forEach((i) => acumular(i.fecha, 'ingreso', Number(i.monto)));

    return Array.from(mapa.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([clave, val]) => {
        const mes = Number(clave.split('-')[1]);
        return { label: NOMBRES_MES[mes].slice(0, 3) + " " + clave.slice(2, 4), ...val };
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
    NOMBRES_MES[this.mesCalendario().getMonth()].toUpperCase() + ' ' + this.mesCalendario().getFullYear()
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
    const fallo = (mensaje: string) => { this.error.update(actual => actual ? actual + ' ' + mensaje : mensaje); return of([]); };
    forkJoin({
      planes: this.planService.listar().pipe(catchError(() => fallo('No se pudieron cargar las cuentas y presupuestos.'))),
      gastos: this.gastoService.listar().pipe(catchError(() => fallo('No se pudieron cargar los gastos.'))),
      ingresos: this.ingresoService.listar().pipe(catchError(() => fallo('No se pudieron cargar los ingresos.'))),
      ahorros: this.ahorroService.listar().pipe(catchError(() => fallo('No se pudieron cargar los ahorros.')))
    }).pipe(finalize(() => this.cargando.set(false))).subscribe(datos => {
      this.planes.set(datos.planes); this.gastosTodos.set(datos.gastos);
      this.ingresosTodos.set(datos.ingresos); this.ahorrosTodos.set(datos.ahorros);
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
