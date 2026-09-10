import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ResumenCategoria } from '../gastos-page/gasto.models';
import { GastoService } from '../gastos-page/gasto.service';
import { Categoria } from './categoria.models';
import { CategoriaService } from './categoria.service';

interface NuevaCategoriaForm {
  nombre: FormControl<string>;
}

interface NuevaSubcategoriaForm {
  nombre: FormControl<string>;
}

export const ICONOS_CATEGORIA = [
  { key: 'food', label: 'Alimentacion' },
  { key: 'car', label: 'Transporte' },
  { key: 'home', label: 'Vivienda' },
  { key: 'health', label: 'Salud' },
  { key: 'entertainment', label: 'Entretenimiento' },
  { key: 'shopping', label: 'Compras' },
  { key: 'education', label: 'Educacion' },
  { key: 'tag', label: 'Otro' },
];

@Component({
  selector: 'app-categorias-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './categorias-page.component.html',
  styleUrl: './categorias-page.component.scss',
})
export class CategoriasPageComponent implements OnInit {
  readonly categorias = signal<Categoria[]>([]);
  readonly resumenGastos = signal<ResumenCategoria[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  readonly iconos = ICONOS_CATEGORIA;
  readonly iconoSeleccionado = signal('tag');

  readonly seleccionadaId = signal<string | null>(null);
  readonly mostrarNuevaSub = signal(false);
  readonly guardando = signal(false);
  readonly errorForm = signal<string | null>(null);

  readonly principales = computed(() =>
    this.categorias().filter((c) => !c.categoriaPadreId)
  );

  readonly seleccionada = computed(
    () => this.principales().find((c) => c.id === this.seleccionadaId()) ?? null
  );

  readonly subcategorias = computed(() =>
    this.categorias().filter((c) => c.categoriaPadreId === this.seleccionadaId())
  );

  readonly maxValorMes = computed(() => {
    const valores = this.resumenGastos().map((r) => Number(r.total));
    return Math.max(...valores, 1);
  });

  readonly formNueva: FormGroup<NuevaCategoriaForm>;
  readonly formSub: FormGroup<NuevaSubcategoriaForm>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly categoriaService: CategoriaService,
    private readonly gastoService: GastoService
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
    this.gastoService.resumen().subscribe({ next: (r) => this.resumenGastos.set(r) });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.categoriaService.listar().subscribe({
      next: (categorias) => {
        this.categorias.set(categorias);
        this.cargando.set(false);
        if (!this.seleccionadaId() && categorias.length) {
          const primeraPrincipal = categorias.find((c) => !c.categoriaPadreId);
          if (primeraPrincipal) this.seleccionadaId.set(primeraPrincipal.id);
        }
      },
      error: () => {
        this.error.set('No se pudieron cargar las categorias.');
        this.cargando.set(false);
      },
    });
  }

  seleccionar(id: string): void {
    this.seleccionadaId.set(id);
    this.mostrarNuevaSub.set(false);
  }

  onCambiarSelect(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.seleccionar(id);
  }

  seleccionarIcono(key: string): void {
    this.iconoSeleccionado.set(key);
  }

  crearPrincipal(): void {
    if (this.formNueva.invalid) {
      this.formNueva.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.errorForm.set(null);

    const { nombre } = this.formNueva.getRawValue();

    this.categoriaService
      .crear({ nombre, icono: this.iconoSeleccionado(), categoriaPadreId: null })
      .subscribe({
        next: (categoria) => {
          this.guardando.set(false);
          this.categorias.update((lista) => [...lista, categoria]);
          this.seleccionadaId.set(categoria.id);
          this.formNueva.reset({ nombre: '' });
          this.iconoSeleccionado.set('tag');
        },
        error: (err) => {
          this.guardando.set(false);
          this.errorForm.set(err?.error?.error ?? 'No se pudo crear la categoria.');
        },
      });
  }

  toggleNuevaSub(): void {
    this.mostrarNuevaSub.update((v) => !v);
    this.formSub.reset({ nombre: '' });
  }

  crearSubcategoria(): void {
    const padre = this.seleccionada();
    if (!padre || this.formSub.invalid) {
      this.formSub.markAllAsTouched();
      return;
    }

    const { nombre } = this.formSub.getRawValue();

    this.categoriaService
      .crear({ nombre, icono: padre.icono, categoriaPadreId: padre.id })
      .subscribe({
        next: (categoria) => {
          this.categorias.update((lista) => [...lista, categoria]);
          this.mostrarNuevaSub.set(false);
        },
        error: (err) =>
          this.errorForm.set(err?.error?.error ?? 'No se pudo crear la subcategoria.'),
      });
  }

  editarSubcategoria(sub: Categoria): void {
    const nuevoNombre = prompt('Nuevo nombre de la subcategoria:', sub.nombre);
    if (!nuevoNombre || nuevoNombre.trim() === sub.nombre) return;

    this.categoriaService
      .actualizar(sub.id, { nombre: nuevoNombre.trim(), categoriaPadreId: sub.categoriaPadreId })
      .subscribe({
        next: (actualizada) => {
          this.categorias.update((lista) =>
            lista.map((c) => (c.id === actualizada.id ? actualizada : c))
          );
        },
        error: () => this.error.set('No se pudo actualizar la subcategoria.'),
      });
  }

  eliminarSubcategoria(sub: Categoria): void {
    const confirmado = confirm(`¿Eliminar la subcategoria "${sub.nombre}"?`);
    if (!confirmado) return;

    this.categoriaService.eliminar(sub.id).subscribe({
      next: () => this.categorias.update((lista) => lista.filter((c) => c.id !== sub.id)),
      error: () => this.error.set('No se pudo eliminar la subcategoria.'),
    });
  }

  alturaBarra(total: number): number {
    return (Number(total) / this.maxValorMes()) * 160;
  }

  yBarra(total: number): number {
    return 200 - this.alturaBarra(total);
  }
}
