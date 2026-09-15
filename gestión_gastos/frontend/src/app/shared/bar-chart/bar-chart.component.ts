import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';
export interface GrupoBarras { label: string; valores: number[]; }
@Component({ selector: 'app-bar-chart', standalone: true, imports: [CommonModule], templateUrl: './bar-chart.component.html', styleUrl: './bar-chart.component.scss' })
export class BarChartComponent {
 @Input() titulo = 'Movimientos en quetzales';
 @Input() series: string[] = [];
 @Input() set datos(value: GrupoBarras[]) { this.grupos.set(value); }
 readonly grupos = signal<GrupoBarras[]>([]);
 readonly ancho = computed(() => Math.max(520, 105 + this.grupos().length * 80));
 readonly escala = computed(() => {
  const valores = this.grupos().flatMap(g => g.valores).filter(Number.isFinite);
  const min = Math.min(0, ...valores), max = Math.max(0, ...valores);
  const magnitud = Math.max(Math.abs(min), max, 1);
  const potencia = Math.pow(10, Math.floor(Math.log10(magnitud)));
  const limite = Math.ceil(magnitud / potencia) * potencia;
  const inferior = min < 0 ? -limite : 0, superior = max > 0 || min === 0 ? limite : 0;
  return { min: inferior, max: superior, marcas: Array.from({length: 5}, (_, i) => inferior + (superior - inferior) * i / 4) };
 });
 y(valor: number): number { const e = this.escala(); return 205 - (valor - e.min) / (e.max - e.min) * 165; }
 x(index: number): number { return 130 + index * 80; }
 anchoBarra(cantidad: number): number { return Math.min(28, 54 / Math.max(1, cantidad)); }
 color(index: number): string { return ['var(--d-accent, #e2672e)', 'var(--d-chart-expense, #34312d)', '#a18c6a'][index % 3]; }
 altura(valor: number): number { return Math.abs(this.y(valor) - this.y(0)); }
 techo(valor: number): number { return Math.min(this.y(valor), this.y(0)); }
}
