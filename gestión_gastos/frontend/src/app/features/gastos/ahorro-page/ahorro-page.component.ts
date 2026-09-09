import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Ahorro, AhorroInput, Categoria, ResumenCategoria, TipoAhorro } from './ahorro.models';
import { AhorroService } from './ahorro.service';

interface AhorroForm {
  monto: FormControl<number>;
  descripcion: FormControl<string>;
  categoriaId: FormControl<string>;
  fecha: FormControl<string>;
  tipo: FormControl<TipoAhorro>;
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
  selector: 'app-ahorro-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ahorro-page.component.html',
  styleUrl: './ahorro-page.component.scss',
})
export class AhorroPageComponent implements OnInit {
  readonly ahorros = signal<Ahorro[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly resumenCategorias = signal<ResumenCategoria[]>([]);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);

  readonly mostrarForm = signal(false);
  readonly mostrarLista = signal(false);
  readonly mostrarNuevaCategoria = signal(false);
  readonly idEnEdicion = signal<string | null>(null);
  readonly errorForm = signal<string | null>(null);

  readonly form: FormGroup<AhorroForm>;
  readonly formCategoria: FormGroup<CategoriaForm>;

  // --- Totales calculados a partir de los gastos reales -----------------

  readonly totalAhorros = computed(() =>
    this.ahorros().reduce(
      (sum, i) => sum + (i.tipo === 'RETIRO' ? -Number(i.monto) : Number(i.monto)),
      0
    )
  );

  readonly totalDelMes = computed(() => {
    const ahora = new Date();
    return this.ahorros()
      .filter((i) => {
        const f = new Date(i.fecha);
        return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
      })
      .reduce((sum, i) => sum + (i.tipo === 'RETIRO' ? -Number(i.monto) : Number(i.monto)), 0);
  });

  readonly datosPorMes = computed<PuntoMes[]>(() => {
    const mapa = new Map<string, number>();

    for (const ahorro of this.ahorros()) {
      const f = new Date(ahorro.fecha);
      const clave = `${f.getFullYear()}-${f.getMonth()}`;
      const signo = ahorro.tipo === 'RETIRO' ? -1 : 1;
      mapa.set(clave, (mapa.get(clave) ?? 0) + signo * Number(ahorro.monto));
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
    const valores = this.datosPorMes().map((p) => Math.abs(p.total));
    return Math.max(...valores, 1);
  });

  readonly totalResumen = computed(() =>
    this.resumenCategorias().reduce((sum, r) => sum + Number(r.total), 0)
  );

  constructor(
    private readonly fb: FormBuilder,
    private readonly ahorroService: AhorroService
  ) {
    this.form = this.fb.nonNullable.group({
      monto: [0, [Validators.required, Validators.min(0.01)]],
      descripcion: [''],
      categoriaId: ['', [Validators.required]],
      fecha: [this.hoyISO()],
      tipo: ['DEPOSITO' as TipoAhorro],
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

    this.ahorroService.listarCategorias().subscribe({
      next: (categorias) => this.categorias.set(categorias),
      error: () => this.error.set('No se pudieron cargar las categorias.'),
    });

    this.ahorroService.listar().subscribe({
      next: (ahorros) => {
        this.ahorros.set(ahorros);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los ahorros.');
        this.cargando.set(false);
      },
    });

    this.ahorroService.resumen().subscribe({
      next: (resumen) => this.resumenCategorias.set(resumen),
    });
  }

  private hoyISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // --- Alta / edicion -------------------------------------------------

  abrirNuevo(tipo: TipoAhorro = 'DEPOSITO'): void {
    this.idEnEdicion.set(null);
    this.errorForm.set(null);
    this.form.reset({ monto: 0, descripcion: '', categoriaId: '', fecha: this.hoyISO(), tipo });
    this.mostrarForm.set(true);
    this.mostrarLista.set(false);
  }

  toggleLista(): void {
    this.mostrarLista.update((v) => !v);
    this.mostrarForm.set(false);
  }

  editar(ahorro: Ahorro): void {
    this.idEnEdicion.set(ahorro.id);
    this.errorForm.set(null);
    this.form.reset({
      monto: Number(ahorro.monto),
      descripcion: ahorro.descripcion ?? '',
      categoriaId: ahorro.categoriaId,
      fecha: ahorro.fecha.slice(0, 10),
      tipo: ahorro.tipo,
    });
    this.mostrarForm.set(true);
  }

  eliminar(ahorro: Ahorro): void {
    const confirmado = confirm(
      `¿Eliminar el registro de Q${Number(ahorro.monto).toFixed(2)}?`
    );
    if (!confirmado) return;

    this.ahorroService.eliminar(ahorro.id).subscribe({
      next: () => this.cargarTodo(),
      error: () => this.error.set('No se pudo eliminar el registro.'),
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
      return;
    }

    this.guardando.set(true);
    this.errorForm.set(null);

    const raw = this.form.getRawValue();
    const payload = {
      monto: Number(raw.monto),
      descripcion: raw.descripcion || undefined,
      categoriaId: raw.categoriaId,
      fecha: raw.fecha ? new Date(raw.fecha).toISOString() : undefined,
      tipo: raw.tipo,
    };

    const id = this.idEnEdicion();
    const request = id
      ? this.ahorroService.actualizar(id, payload)
      : this.ahorroService.crear(payload);

    request.subscribe({
      next: () => {
        this.guardando.set(false);
        this.mostrarForm.set(false);
        this.idEnEdicion.set(null);
        this.cargarTodo();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorForm.set(err?.error?.error ?? 'No se pudo guardar el ahorro.');
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

    this.ahorroService.crearCategoria(nombre, color).subscribe({
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
    return (Math.abs(total) / this.maxValorMes()) * 160;
  }

  yBarra(total: number): number {
    return total >= 0 ? 200 - this.alturaBarra(total) : 200;
  }

  // --- Helpers para el donut ----------------------------------------------

  donutLargo(total: number): number {
    const circunferencia = 251;
    const pct = this.totalResumen() > 0 ? (Number(total) / this.totalResumen()) * 100 : 0;
    return (pct / 100) * circunferencia;
  }

  donutOffset(index: number): number {
    const circunferencia = 251;
    const acumulado = this.resumenCategorias()
      .slice(0, index)
      .reduce((sum, r) => sum + Number(r.total), 0);
    const pct = this.totalResumen() > 0 ? (acumulado / this.totalResumen()) * 100 : 0;
    return circunferencia - (pct / 100) * circunferencia;
  }

  porcentaje(total: number): number {
    if (this.totalResumen() === 0) return 0;
    return (Number(total) / this.totalResumen()) * 100;
  }
}
