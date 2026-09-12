import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface RangoFechas {
  desde: string | null;
  hasta: string | null;
  etiqueta: string;
}

const hoyISO = (d: Date) => d.toISOString().slice(0, 10);

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
  @Output() rangoChange = new EventEmitter<RangoFechas>();

  readonly abierto = signal(false);
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
