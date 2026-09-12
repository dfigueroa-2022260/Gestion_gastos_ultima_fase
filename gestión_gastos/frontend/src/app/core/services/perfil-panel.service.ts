import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PerfilPanelService {
  readonly abierto = signal(false);

  toggle(): void {
    this.abierto.update((v) => !v);
  }

  cerrar(): void {
    this.abierto.set(false);
  }
}
