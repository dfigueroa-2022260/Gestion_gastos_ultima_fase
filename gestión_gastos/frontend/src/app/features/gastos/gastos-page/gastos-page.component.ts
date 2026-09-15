import { TopFiltersComponent, RangoFechas } from '../../../shared/top-filters/top-filters.component';
import { enRango, resumir } from '../../../shared/registro.utils';
import { inject } from '@angular/core';
import { DialogService } from '../../../shared/dialog.service';
import { hoyLocal, fechaPasada, descripcionObligatoria } from '../../../shared/registro.utils';
import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Categoria, Gasto, ResumenCategoria } from './gasto.models';
import { GastoService } from './gasto.service';

interface GastoForm {
  monto: FormControl<number>;
  descripcion: FormControl<string>;
  categoriaId: FormControl<string>;
  fecha: FormControl<string>;
}

interface CategoriaForm {
  nombre: FormControl<string>;
  color: FormControl<string>;
}

interface PuntoMes {
  label: string;
  total: number;
}

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-gastos-page',
  standalone: true,
  imports: [TopFiltersComponent, CommonModule, ReactiveFormsModule],
  templateUrl: './gastos-page.component.html',
  styleUrl: './gastos-page.component.scss',
})
export class GastosPageComponent implements OnInit {
  readonly rango = signal<RangoFechas>({desde:null,hasta:null,etiqueta:'Todo'});
  onRango(r: RangoFechas): void { this.rango.set(r); }
  readonly dialog = inject(DialogService);
  private readonly gastosTodos = signal<Gasto[]>([]);
  readonly gastos = computed(() => this.gastosTodos().filter(r => enRango(r.fecha, this.rango())));
  readonly categorias = signal<Categoria[]>([]);
  readonly resumenCategorias = computed(() => resumir(this.gastos()));

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly mostrarForm = signal(false);
  readonly mostrarLista = signal(false);
  readonly mostrarNuevaCategoria = signal(false);
  readonly idEnEdicion = signal<string | null>(null);
  readonly errorForm = signal<string | null>(null);

  readonly form: FormGroup<GastoForm>;
  readonly formCategoria: FormGroup<CategoriaForm>;

  // --- Totales calculados a partir de los gastos reales -----------------

  readonly totalGastos = computed(() =>
    this.gastos().reduce((sum, i) => sum + Number(i.monto), 0)
  );

  readonly totalDelMes = computed(() => {
    const ahora = new Date();
    return this.gastos()
      .filter((i) => {
        const f = new Date(i.fecha.slice(0, 10) + 'T12:00:00');
        return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
      })
      .reduce((sum, i) => sum + Number(i.monto), 0);
  });

  readonly datosPorMes = computed<PuntoMes[]>(() => {
    const mapa = new Map<string, number>();

    for (const gasto of this.gastos()) {
      const f = new Date(gasto.fecha.slice(0, 10) + 'T12:00:00');
      const clave = `${f.getFullYear()}-${String(f.getMonth()).padStart(2, '0')}`;
      mapa.set(clave, (mapa.get(clave) ?? 0) + Number(gasto.monto));
    }

    return Array.from(mapa.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .slice(-7)
      .map(([clave, total]) => {
        const mes = Number(clave.split('-')[1]);
        return { label: NOMBRES_MES[mes].slice(0, 3), total };
      });
  });

  readonly maxValorMes = computed(() => {
    const valores = this.datosPorMes().map((p) => p.total);
    return Math.max(...valores, 1);
  });

  readonly totalResumen = computed(() =>
    this.resumenCategorias().reduce((sum, r) => sum + Number(r.total), 0)
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly gastoService: GastoService
  ) {
    this.form = this.fb.nonNullable.group({
      monto: [0, [Validators.required, Validators.min(0.01)]],
      descripcion: ['', [descripcionObligatoria]],
      categoriaId: ['', [Validators.required]],
      fecha: [this.hoyISO(), [fechaPasada]],
    });

    this.formCategoria = this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      color: ['#E8672A'],
    });
  }

  ngOnInit(): void {
    this.cargarTodo();
  }

  private cargarTodo(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.gastoService.listarCategorias().subscribe({
      next: (categorias) => this.categorias.set(categorias),
      error: () => this.error.set('No se pudieron cargar las categorias.'),
    });

    this.gastoService.listar().subscribe({
      next: (gastos) => {
        this.gastosTodos.set(gastos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los gastos.');
        this.cargando.set(false);
      },
    });

  }

  hoyISO(): string {
    return hoyLocal();
  }

  // --- Alta / edicion -------------------------------------------------

  abrirNuevo(): void {
    this.idEnEdicion.set(null);
    this.errorForm.set(null);
    this.form.reset({ monto: 0, descripcion: '', categoriaId: '', fecha: this.hoyISO() });
    this.mostrarForm.set(true);
    this.mostrarLista.set(false);
  }

  toggleLista(): void {
    this.mostrarLista.update((v) => !v);
    this.mostrarForm.set(false);
  }

  editar(gasto: Gasto): void {
    this.idEnEdicion.set(gasto.id);
    this.errorForm.set(null);
    this.form.reset({
      monto: Number(gasto.monto),
      descripcion: gasto.descripcion ?? '',
      categoriaId: gasto.categoriaId,
      fecha: gasto.fecha.slice(0, 10),
    });
    this.mostrarForm.set(true);
  }

  async eliminar(gasto: Gasto): Promise<void> {
    const confirmado = await this.dialog.confirm(
      `¿Eliminar el gasto de Q${Number(gasto.monto).toFixed(2)}?`
    );
    if (!confirmado) return;

    this.gastoService.eliminar(gasto.id).subscribe({
      next: () => this.cargarTodo(),
      error: () => this.error.set('No se pudo eliminar el gasto.'),
    });
  }

  cancelarForm(): void {
    this.mostrarForm.set(false);
    this.idEnEdicion.set(null);
    this.errorForm.set(null);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorForm.set('Revisa los campos: el monto debe ser mayor a 0, la descripción es obligatoria y la fecha no puede ser futura.');
      return;
    }

    this.guardando.set(true);
    this.errorForm.set(null);

    const raw = this.form.getRawValue();
    const payload = {
      monto: Number(raw.monto),
      descripcion: raw.descripcion.trim(),
      categoriaId: raw.categoriaId,
      fecha: raw.fecha ? raw.fecha + 'T00:00:00.000Z' : undefined,
    };

    const id = this.idEnEdicion();
    const request = id
      ? this.gastoService.actualizar(id, payload)
      : this.gastoService.crear(payload);

    request.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarForm.set(false);
        this.idEnEdicion.set(null);
        this.cargarTodo();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorForm.set(err?.error?.error ?? 'No se pudo guardar el gasto.');
      },
    });
  }

  // --- Categoria rapida -------------------------------------------------

  toggleNuevaCategoria(): void {
    this.mostrarNuevaCategoria.update((v) => !v);
    this.formCategoria.reset({ nombre: '', color: '#E8672A' });
  }

  guardarCategoria(): void {
    if (this.formCategoria.invalid) {
      this.formCategoria.markAllAsTouched();
      return;
    }

    const { nombre, color } = this.formCategoria.getRawValue();

    this.gastoService.crearCategoria(nombre, color).subscribe({
      next: (categoria) => {
        this.categorias.update((lista) => [...lista, categoria]);
        this.form.controls.categoriaId.setValue(categoria.id);
        this.mostrarNuevaCategoria.set(false);
      },
      error: () => this.errorForm.set('No se pudo crear la categoria.'),
    });
  }

  // --- Helpers para el SVG de barras -------------------------------------

  alturaBarra(total: number): number {
    return (total / this.maxValorMes()) * 160;
  }

  yBarra(total: number): number {
    return 200 - this.alturaBarra(total);
  }

  // --- Helpers para el donut ----------------------------------------------

  donutLargo(total: number): number {
    const circunferencia = 2 * Math.PI * 40;
    const pct = this.totalResumen() > 0 ? (Number(total) / this.totalResumen()) * 100 : 0;
    return (pct / 100) * circunferencia;
  }

  donutOffset(index: number): number {
    const circunferencia = 2 * Math.PI * 40;
    const acumulado = this.resumenCategorias()
      .slice(0, index)
      .reduce((sum, r) => sum + Number(r.total), 0);
    const pct = this.totalResumen() > 0 ? (acumulado / this.totalResumen()) * 100 : 0;
    return -(pct / 100) * circunferencia;
  }

  porcentaje(total: number): number {
    if (this.totalResumen() === 0) return 0;
    return (Number(total) / this.totalResumen()) * 100;
  }
}
