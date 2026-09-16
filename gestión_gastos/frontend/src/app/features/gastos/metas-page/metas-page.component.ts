import { NonNegativeDirective } from '../../../shared/non-negative.directive';
import { BarChartComponent } from '../../../shared/bar-chart/bar-chart.component';
import { TopFiltersComponent, RangoFechas } from '../../../shared/top-filters/top-filters.component';
import { enRango } from '../../../shared/registro.utils';
import { inject } from '@angular/core';
import { DialogService } from '../../../shared/dialog.service';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { Meta, PrioridadMeta } from './meta.models';
import { MetaService } from './meta.service';

interface MetaForm {
  icono: FormControl<string>;
  nombre: FormControl<string>;
  montoObjetivo: FormControl<number>;
  fechaCumplimiento: FormControl<string>;
  prioridad: FormControl<PrioridadMeta>;
  automatizarAhorro: FormControl<boolean>;
}

interface PuntoTendencia {
  label: string;
  total: number;
}

const NOMBRES_MES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

@Component({
  selector: 'app-metas-page',
  standalone: true,
  imports: [NonNegativeDirective, BarChartComponent, TopFiltersComponent, CommonModule, ReactiveFormsModule],
  templateUrl: './metas-page.component.html',
  styleUrl: './metas-page.component.scss',
})
export class MetasPageComponent implements OnInit {
  readonly datosBarras = computed(() => this.metas().map(m => ({label: m.nombre, valores: [Number(m.montoActual), Number(m.montoObjetivo)]})));
  readonly dialog = inject(DialogService);
  readonly metasTodas = signal<Meta[]>([]);
  readonly metas = computed(() => this.metasTodas().filter(m => enRango(m.createdAt, this.rango())));
  readonly rango = signal<RangoFechas>({desde:null,hasta:null,etiqueta:'Todo'});
  readonly iconos = [
 {key:'food',label:'Alimentación'}, {key:'car',label:'Transporte'}, {key:'home',label:'Vivienda'}, {key:'health',label:'Salud'},
 {key:'entertainment',label:'Entretenimiento'}, {key:'shopping',label:'Compras'}, {key:'education',label:'Educación'}, {key:'tag',label:'Otro'}
 ];
 iconoMeta(icono: string): string {
 const anteriores: Record<string,string> = {'🏠':'home','🚗':'car','🎓':'education','❤️':'health','💻':'entertainment','✈️':'car'};
 return this.iconos.some(i=>i.key===icono) ? icono : (anteriores[icono] ?? 'tag');
 }
  onRango(r: RangoFechas): void { this.rango.set(r); }
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);
  readonly modoEdicion = signal(false);



  readonly form: FormGroup<MetaForm>;



  constructor(
    private readonly fb: FormBuilder,
    private readonly metaService: MetaService
  ) {
    this.form = this.fb.nonNullable.group({
      icono: ['tag'],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      montoObjetivo: [0, [Validators.required, Validators.min(0.01)]],
      fechaCumplimiento: [''],
      prioridad: ['MEDIA' as PrioridadMeta],
      automatizarAhorro: [false],
    });
  }

  ngOnInit(): void {
    this.cargarMetas();

  }

  private cargarMetas(): void {
    this.cargando.set(true);
    this.metaService.listar().subscribe({
      next: (metas) => {
        this.metasTodas.set(metas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las metas.');
        this.cargando.set(false);
      },
    });
  }

  progreso(meta: Meta): number {
    if (meta.montoObjetivo <= 0) return 0;
    return Math.min(100, Math.round((Number(meta.montoActual) / Number(meta.montoObjetivo)) * 100));
  }

  estado(meta: Meta): string {
    const pct = this.progreso(meta);
    if (pct >= 100) return 'Cumplida';
    if (pct >= 80) return 'Casi listo';
    return 'A tiempo';
  }

  toggleEdicion(): void {
    this.modoEdicion.update((v) => !v);
  }

  async aportar(meta: Meta): Promise<void> {
    const input = await this.dialog.prompt(`¿Cuanto queres aportar a "${meta.nombre}"?`, '100');
    const monto = Number(input);
    if(input === null) return;
    if (!Number.isFinite(monto) || monto < 0.01) { this.error.set('El aporte debe ser mayor a 0.'); return; }

    const nuevoActual = Number(meta.montoActual) + monto;
    this.metaService.actualizar(meta.id, { montoActual: nuevoActual }).subscribe({
      next: (actualizada) => {
        this.metasTodas.update((lista) => lista.map((m) => (m.id === actualizada.id ? actualizada : m)));
      },
      error: () => this.error.set('No se pudo actualizar el aporte.'),
    });
  }

  async eliminar(meta: Meta): Promise<void> {
    const confirmado = await this.dialog.confirm(`¿Eliminar la meta "${meta.nombre}"?`);
    if (!confirmado) return;

    this.metaService.eliminar(meta.id).subscribe({
      next: () => this.metasTodas.update((lista) => lista.filter((m) => m.id !== meta.id)),
      error: () => this.error.set('No se pudo eliminar la meta.'),
    });
  }

  crear(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorForm.set('Completa el nombre y un monto objetivo mayor a 0.');
      return;
    }

    this.guardando.set(true);
    this.errorForm.set(null);
    const raw = this.form.getRawValue();

    this.metaService
      .crear({
        nombre: raw.nombre,
        icono: raw.icono,
        montoObjetivo: Number(raw.montoObjetivo),
        fechaCumplimiento: raw.fechaCumplimiento || undefined,
        prioridad: raw.prioridad,
        automatizarAhorro: raw.automatizarAhorro,
      })
      .subscribe({
        next: (meta) => {
          this.guardando.set(false);
          this.metasTodas.update((lista) => [meta, ...lista]);
          this.form.reset({
            nombre: '',
            icono: 'tag',
            montoObjetivo: 0,
            fechaCumplimiento: '',
            prioridad: 'MEDIA',
            automatizarAhorro: false,
          });
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorForm.set(err?.error?.error ?? 'No se pudo crear la meta.');
        },
      });
  }

}
