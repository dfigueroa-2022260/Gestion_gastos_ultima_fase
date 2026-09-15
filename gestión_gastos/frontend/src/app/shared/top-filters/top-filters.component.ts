import { hoyLocal } from '../registro.utils';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface RangoFechas {
  desde: string | null;
  hasta: string | null;
  etiqueta: string;
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
  @Input() set rango(value: RangoFechas) {
    this.desde.set(value.desde ?? ''); this.hasta.set(value.hasta ?? ''); this.etiquetaActual.set(value.etiqueta);
  }
  @Input() soloCalendario = false;
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
    });
  }
}
