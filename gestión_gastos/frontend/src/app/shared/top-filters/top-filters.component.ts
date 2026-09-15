import { hoyLocal } from '../registro.utils';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface RangoFechas {
  desde: string | null;
  hasta: string | null;
  etiqueta: string;
  texto?: string;
  minimo?: number | null;
  maximo?: number | null;
}

const hoyISO = (d: Date) => hoyLocal(d);

/**
 * Botones "Filter" + "Calendario" reutilizados en todas las paginas.
 * Al elegir un preset o un rango personalizado, emite (rangoChange) con
 * fechas reales; cada pagina decide como filtrar sus propios datos con eso.
 */
@Component({
  selector: 'app-top-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './top-filters.component.html',
  styleUrl: './top-filters.component.scss',
})
export class TopFiltersComponent {
  private readonly elemento = inject(ElementRef<HTMLElement>);
  @Input() cerrarAlClickFuera = true;

  @HostListener('document:click', ['$event'])
  onClickFuera(event: MouseEvent): void {
    if (this.cerrarAlClickFuera && this.abierto() && !event.composedPath().includes(this.elemento.nativeElement)) {
      this.cerrar();
    }
  }

  @Input() set rango(value: RangoFechas) {
    this.desde.set(value.desde ?? ''); this.hasta.set(value.hasta ?? ''); this.etiquetaActual.set(value.etiqueta);
    this.texto.set(value.texto ?? ''); this.minimo.set(value.minimo ?? null); this.maximo.set(value.maximo ?? null);
  }
  @Input() soloCalendario = false;
  @Input() movimientos = false;
  readonly modo = signal<'filtros' | 'calendario'>('calendario');
  readonly texto = signal('');
  readonly minimo = signal<number | null>(null);
  readonly maximo = signal<number | null>(null);
  abrir(modo: 'filtros' | 'calendario'): void {
    if (this.abierto() && this.modo() === modo) this.cerrar();
    else { this.modo.set(modo); this.error.set(''); this.abierto.set(true); }
  }
  aplicarFiltros(): void {
    this.error.set('');
    if ((this.minimo() != null && this.minimo()! < 0) || (this.maximo() != null && this.maximo()! < 0) || (this.minimo() != null && this.maximo() != null && this.minimo()! > this.maximo()!)) {
      this.error.set('Revisa el importe mínimo y máximo.'); return;
    }
    this.emitir(this.etiquetaActual()); this.cerrar();
  }
  limpiarFiltros(): void {
    this.texto.set(''); this.minimo.set(null); this.maximo.set(null); this.aplicarFiltros();
  }
  @Output() rangoChange = new EventEmitter<RangoFechas>();

  readonly abierto = signal(false);
  readonly error = signal('');
  readonly etiquetaActual = signal('Todo');
  readonly desde = signal('');
  readonly hasta = signal('');

  toggle(): void {
    this.abierto.update((v) => !v);
  }

  cerrar(): void {
    this.abierto.set(false);
  }

  aplicarPreset(preset: 'todo' | 'mes' | 'mesPasado' | 'anio'): void {
    const ahora = new Date();
    let desde: Date | null = null;
    let hasta: Date | null = null;
    let etiqueta = 'Todo';

    if (preset === 'mes') {
      desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      hasta = ahora;
      etiqueta = 'Este mes';
    } else if (preset === 'mesPasado') {
      desde = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      hasta = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
      etiqueta = 'Mes pasado';
    } else if (preset === 'anio') {
      desde = new Date(ahora.getFullYear(), 0, 1);
      hasta = ahora;
      etiqueta = 'Este año';
    }

    this.etiquetaActual.set(etiqueta);
    this.desde.set(desde ? hoyISO(desde) : '');
    this.hasta.set(hasta ? hoyISO(hasta) : '');
    this.emitir(etiqueta);
    this.cerrar();
  }

  aplicarPersonalizado(): void {
    this.error.set('');
    if(this.desde() && this.hasta() && this.desde() > this.hasta()) { this.error.set('La fecha inicial no puede ser posterior a la final.'); return; }
    if (!this.desde() && !this.hasta()) {
      this.aplicarPreset('todo');
      return;
    }
    this.etiquetaActual.set('Personalizado');
    this.emitir('Personalizado');
    this.cerrar();
  }

  private emitir(etiqueta: string): void {
    this.rangoChange.emit({
      desde: this.desde() || null,
      hasta: this.hasta() || null,
      etiqueta,
      texto: this.texto().trim(), minimo: this.minimo(), maximo: this.maximo(),
    });
  }
}
