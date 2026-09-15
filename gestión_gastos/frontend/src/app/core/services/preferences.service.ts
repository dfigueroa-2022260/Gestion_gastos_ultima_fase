import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly document = inject(DOCUMENT);
  readonly oscuro = signal(false);
  readonly avisos = signal(true);
  constructor() {
    try {
      this.oscuro.set(localStorage.getItem('cash_track_theme') === 'dark');
      this.avisos.set(localStorage.getItem('cash_track_alerts') !== 'off');
    } catch { /* Las preferencias siguen funcionando sin almacenamiento. */ }
    this.aplicar();
  }
  tema(oscuro: boolean): void {
    this.oscuro.set(oscuro);
    this.aplicar();
    try { localStorage.setItem('cash_track_theme', oscuro ? 'dark' : 'light'); } catch {}
  }
  notificaciones(activas: boolean): void {
    this.avisos.set(activas);
    try { localStorage.setItem('cash_track_alerts', activas ? 'on' : 'off'); } catch {}
  }
  private aplicar(): void {
    this.document.documentElement.classList.toggle('dark-theme', this.oscuro());
    this.document.documentElement.style.colorScheme = this.oscuro() ? 'dark' : 'light';
  }
}
