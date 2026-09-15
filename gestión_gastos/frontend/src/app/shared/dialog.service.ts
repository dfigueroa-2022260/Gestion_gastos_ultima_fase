import { Injectable, signal } from '@angular/core';
@Injectable({providedIn: 'root'})
export class DialogService {
 readonly estado = signal<{mensaje:string; entrada:boolean; valor:string} | null>(null);
 private resolver: ((valor:string | null)=>void) | null = null;
 confirm(mensaje:string): Promise<boolean> { return this.abrir(mensaje,false,'').then(v=>v !== null); }
 prompt(mensaje:string, valor=''): Promise<string | null> { return this.abrir(mensaje,true,valor); }
 private abrir(mensaje:string, entrada:boolean, valor:string): Promise<string | null> {
  this.resolver?.(null); this.estado.set({mensaje,entrada,valor});
  return new Promise(resolve => this.resolver=resolve);
 }
 cerrar(valor:string | null): void { this.estado.set(null); this.resolver?.(valor); this.resolver=null; }
}
