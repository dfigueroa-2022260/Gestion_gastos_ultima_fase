import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';
interface Segmento { categoriaId: string; nombre: string; total: number; color?: string; }
@Component({
 selector: 'app-category-donut', standalone: true, imports: [CommonModule],
 templateUrl: './category-donut.component.html', styleUrl: './category-donut.component.scss'
})
export class CategoryDonutComponent {
 @Input() titulo = 'Resumen';
 @Input() etiqueta = 'Todo';
 @Input() detalle = '';
 @Input() set datos(value: Segmento[]) { this.segmentos.set(value.filter(s => Number(s.total) > 0)); }
 readonly segmentos = signal<Segmento[]>([]);
 readonly seleccionado = signal<string | null>(null);
 readonly seleccion = computed(() => this.segmentos().find(s => s.categoriaId === this.seleccionado()) ?? null);
 readonly total = computed(() => this.segmentos().reduce((sum, s) => sum + Number(s.total), 0));
 readonly circunferencia = 2 * Math.PI * 48;
 seleccionar(id: string): void { this.seleccionado.update(actual => actual === id ? null : id); }
 color(index: number): string { return ['#ff8b4c', '#d96a32', '#f2dfcc', '#816b5b', '#b8967d', '#caaa8b'][index % 6]; }
 porcentaje(valor: number): number { return this.total() > 0 ? Number(valor) / this.total() * 100 : 0; }
 largo(valor: number): number { return this.porcentaje(valor) / 100 * this.circunferencia; }
 offset(index: number): number { return -this.largo(this.segmentos().slice(0, index).reduce((sum, s) => sum + Number(s.total), 0)); }
}
