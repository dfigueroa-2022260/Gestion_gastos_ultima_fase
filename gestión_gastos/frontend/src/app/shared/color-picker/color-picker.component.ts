import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
@Component({selector: 'app-color-picker', standalone: true, imports: [CommonModule], templateUrl: './color-picker.component.html', styleUrl: './color-picker.component.scss'})
export class ColorPickerComponent {
 @Input() color = '#e2672e';
 @Output() colorChange = new EventEmitter<string>();
 readonly paleta = [ {color:'#e2672e',nombre:'Naranja'}, {color:'#7a744a',nombre:'Oliva'}, {color:'#377d86',nombre:'Turquesa'}, {color:'#8b609e',nombre:'Violeta'}, {color:'#c65563',nombre:'Rosa'}, {color:'#3777b3',nombre:'Azul'} ];
 elegir(color: string): void { this.colorChange.emit(color); }
}
