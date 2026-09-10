import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ICONOS_CATEGORIA } from '../categorias-page/categorias-page.component';
import { Etiqueta } from './etiqueta.models';
import { EtiquetaService } from './etiqueta.service';

interface NuevaEtiquetaForm {
  nombre: FormControl<string>;
}

interface NuevaSubForm {
  nombre: FormControl<string>;
}

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const COLORES_ETIQUETA = ['#E8672A', '#F2A472', '#2B2A28', '#F5EEDD'];

@Component({
  selector: 'app-etiquetas-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './etiquetas-page.component.html',
  styleUrl: './etiquetas-page.component.scss',
})
export class EtiquetasPageComponent implements OnInit {
  readonly etiquetas = signal<Etiqueta[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly iconos = ICONOS_CATEGORIA;
  readonly colores = COLORES_ETIQUETA;
  readonly iconoSeleccionado = signal('tag');
  readonly colorSeleccionado = signal(COLORES_ETIQUETA[0]);

  readonly seleccionadaId = signal<string | null>(null);
  readonly detalleAbierto = signal(true);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);

  readonly mesCalendario = signal(new Date());
  readonly diasSemana = DIAS_SEMANA;

  readonly principales = computed(() =>
    this.etiquetas().filter((e) => !e.etiquetaPadreId)
  );

  readonly seleccionada = computed(
    () => this.principales().find((e) => e.id === this.seleccionadaId()) ?? null
  );

  readonly subetiquetas = computed(() =>
    this.etiquetas().filter((e) => e.etiquetaPadreId === this.seleccionadaId())
  );

  readonly formNueva: FormGroup<NuevaEtiquetaForm>;
  readonly formSub: FormGroup<NuevaSubForm>;
  readonly mostrarNuevaSub = signal(false);

  readonly diasCalendario = computed(() => {
    const fecha = this.mesCalendario();
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth();
    const primerDia = new Date(anio, mes, 1);
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
    private readonly fb: FormBuilder,
    private readonly etiquetaService: EtiquetaService
  ) {
    this.formNueva = this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
    });
    this.formSub = this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.etiquetaService.listar().subscribe({
      next: (etiquetas) => {
        this.etiquetas.set(etiquetas);
        this.cargando.set(false);
        if (!this.seleccionadaId() && etiquetas.length) {
          const primera = etiquetas.find((e) => !e.etiquetaPadreId);
          if (primera) this.seleccionadaId.set(primera.id);
        }
      },
      error: () => {
        this.error.set('No se pudieron cargar las etiquetas.');
        this.cargando.set(false);
      },
    });
  }

  seleccionar(id: string): void {
    this.seleccionadaId.set(id);
    this.detalleAbierto.set(true);
  }

  toggleDetalle(): void {
    this.detalleAbierto.update((v) => !v);
  }

  seleccionarIcono(key: string): void {
    this.iconoSeleccionado.set(key);
  }

  seleccionarColor(color: string): void {
    this.colorSeleccionado.set(color);
  }

  crearPrincipal(): void {
    if (this.formNueva.invalid) {
      this.formNueva.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.errorForm.set(null);
    const { nombre } = this.formNueva.getRawValue();

    this.etiquetaService
      .crear({
        nombre,
        icono: this.iconoSeleccionado(),
        color: this.colorSeleccionado(),
        etiquetaPadreId: null,
      })
      .subscribe({
        next: (etiqueta) => {
          this.guardando.set(false);
          this.etiquetas.update((lista) => [...lista, etiqueta]);
          this.seleccionadaId.set(etiqueta.id);
          this.formNueva.reset({ nombre: '' });
          this.iconoSeleccionado.set('tag');
          this.colorSeleccionado.set(COLORES_ETIQUETA[0]);
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorForm.set(err?.error?.error ?? 'No se pudo crear la etiqueta.');
        },
      });
  }

  toggleNuevaSub(): void {
    this.mostrarNuevaSub.update((v) => !v);
    this.formSub.reset({ nombre: '' });
  }

  crearSub(): void {
    const padre = this.seleccionada();
    if (!padre || this.formSub.invalid) {
      this.formSub.markAllAsTouched();
      return;
    }
    const { nombre } = this.formSub.getRawValue();

    this.etiquetaService
      .crear({ nombre, icono: padre.icono, color: padre.color, etiquetaPadreId: padre.id })
      .subscribe({
        next: (etiqueta) => {
          this.etiquetas.update((lista) => [...lista, etiqueta]);
          this.mostrarNuevaSub.set(false);
        },
        error: (err) => this.errorForm.set(err?.error?.error ?? 'No se pudo crear la sub-etiqueta.'),
      });
  }

  editar(sub: Etiqueta): void {
    const nuevoNombre = prompt('Nuevo nombre:', sub.nombre);
    if (!nuevoNombre || nuevoNombre.trim() === sub.nombre) return;

    this.etiquetaService
      .actualizar(sub.id, { nombre: nuevoNombre.trim(), etiquetaPadreId: sub.etiquetaPadreId })
      .subscribe({
        next: (actualizada) => {
          this.etiquetas.update((lista) =>
            lista.map((e) => (e.id === actualizada.id ? actualizada : e))
          );
        },
        error: () => this.error.set('No se pudo actualizar la etiqueta.'),
      });
  }

  eliminar(sub: Etiqueta): void {
    const confirmado = confirm(`¿Eliminar la etiqueta "${sub.nombre}"?`);
    if (!confirmado) return;

    this.etiquetaService.eliminar(sub.id).subscribe({
      next: () => this.etiquetas.update((lista) => lista.filter((e) => e.id !== sub.id)),
      error: () => this.error.set('No se pudo eliminar la etiqueta.'),
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
}
