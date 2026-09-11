import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AhorroService } from '../ahorro-page/ahorro.service';
import { Meta, PrioridadMeta } from './meta.models';
import { MetaService } from './meta.service';

interface MetaForm {
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
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './metas-page.component.html',
  styleUrl: './metas-page.component.scss',
})
export class MetasPageComponent implements OnInit {
  readonly metas = signal<Meta[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);
  readonly modoEdicion = signal(false);

  readonly tendencia = signal<PuntoTendencia[]>([]);

  readonly form: FormGroup<MetaForm>;

  readonly maxTendencia = computed(() =>
    Math.max(...this.tendencia().map((p) => p.total), 1)
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly metaService: MetaService,
    private readonly ahorroService: AhorroService
  ) {
    this.form = this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      montoObjetivo: [0, [Validators.required, Validators.min(1)]],
      fechaCumplimiento: [''],
      prioridad: ['MEDIA' as PrioridadMeta],
      automatizarAhorro: [false],
    });
  }

  ngOnInit(): void {
    this.cargarMetas();
    this.cargarTendencia();
  }

  private cargarMetas(): void {
    this.cargando.set(true);
    this.metaService.listar().subscribe({
      next: (metas) => {
        this.metas.set(metas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las metas.');
        this.cargando.set(false);
      },
    });
  }

  // Tendencia real: ahorro neto acumulado mes a mes, a partir de tus
  // depositos/retiros reales (no es una proyeccion inventada).
  private cargarTendencia(): void {
    this.ahorroService.listar().subscribe({
      next: (ahorros) => {
        const mapa = new Map<string, number>();
        for (const a of ahorros) {
          const f = new Date(a.fecha);
          const clave = `${f.getFullYear()}-${f.getMonth()}`;
          const signo = a.tipo === 'RETIRO' ? -1 : 1;
          mapa.set(clave, (mapa.get(clave) ?? 0) + signo * Number(a.monto));
        }

        const ordenado = Array.from(mapa.entries()).sort((a, b) => (a[0] > b[0] ? 1 : -1));
        let acumulado = 0;
        const puntos = ordenado.map(([clave, val]) => {
          acumulado += val;
          const mes = Number(clave.split('-')[1]);
          return { label: NOMBRES_MES[mes], total: acumulado };
        });
        this.tendencia.set(puntos.slice(-8));
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

  aportar(meta: Meta): void {
    const input = prompt(`¿Cuanto queres aportar a "${meta.nombre}"?`, '100');
    const monto = Number(input);
    if (!input || isNaN(monto) || monto <= 0) return;

    const nuevoActual = Number(meta.montoActual) + monto;
    this.metaService.actualizar(meta.id, { montoActual: nuevoActual }).subscribe({
      next: (actualizada) => {
        this.metas.update((lista) => lista.map((m) => (m.id === actualizada.id ? actualizada : m)));
      },
      error: () => this.error.set('No se pudo actualizar el aporte.'),
    });
  }

  eliminar(meta: Meta): void {
    const confirmado = confirm(`¿Eliminar la meta "${meta.nombre}"?`);
    if (!confirmado) return;

    this.metaService.eliminar(meta.id).subscribe({
      next: () => this.metas.update((lista) => lista.filter((m) => m.id !== meta.id)),
      error: () => this.error.set('No se pudo eliminar la meta.'),
    });
  }

  crear(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.errorForm.set(null);
    const raw = this.form.getRawValue();

    this.metaService
      .crear({
        nombre: raw.nombre,
        montoObjetivo: Number(raw.montoObjetivo),
        fechaCumplimiento: raw.fechaCumplimiento || undefined,
        prioridad: raw.prioridad,
        automatizarAhorro: raw.automatizarAhorro,
      })
      .subscribe({
        next: (meta) => {
          this.guardando.set(false);
          this.metas.update((lista) => [meta, ...lista]);
          this.form.reset({
            nombre: '',
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

  alturaPunto(total: number): number {
    return (total / this.maxTendencia()) * 140;
  }

  yPunto(total: number): number {
    return 180 - this.alturaPunto(total);
  }

  puntosLinea(): string {
    return this.tendencia()
      .map((p, i) => `${30 + i * 55},${this.yPunto(p.total)}`)
      .join(' ');
  }
}
