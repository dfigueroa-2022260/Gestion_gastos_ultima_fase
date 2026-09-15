import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../features/auth/services/auth.service';
import { PreferencesService } from './preferences.service';

export interface Aviso { id: string; mensaje: string; fecha: string; leido: boolean; }
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly auth = inject(AuthService);
  private readonly preferencias = inject(PreferencesService);
  private readonly datos = signal<Record<string, Aviso[]>>(this.leer());
  private readonly temporal = signal<{ usuario: string; mensaje: string } | null>(null);
  private timer?: ReturnType<typeof setTimeout>;
  readonly lista = computed(() => this.datos()[this.auth.usuario()?.id ?? ''] ?? []);
  readonly pendientes = computed(() => this.lista().filter(a => !a.leido).length);
  readonly toast = computed(() => this.temporal()?.usuario === this.auth.usuario()?.id && this.preferencias.avisos() ? this.temporal()?.mensaje : null);
  agregar(usuario: string, mensaje: string): void {
    if (!this.preferencias.avisos()) return;
    const aviso = { id: crypto.randomUUID(), mensaje, fecha: new Date().toISOString(), leido: false };
    this.datos.update(d => ({ ...d, [usuario]: [aviso, ...(d[usuario] ?? [])].slice(0, 50) }));
    this.guardar();
    this.temporal.set({ usuario, mensaje });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.temporal.set(null), 5000);
  }
  marcarLeidas(): void {
    const id = this.auth.usuario()?.id;
    if (!id) return;
    this.datos.update(d => ({ ...d, [id]: (d[id] ?? []).map(a => ({ ...a, leido: true })) }));
    this.guardar();
  }
  limpiar(): void {
    const id = this.auth.usuario()?.id;
    if (!id) return;
    this.datos.update(d => ({ ...d, [id]: [] })); this.guardar();
  }
  cerrarToast(): void { this.temporal.set(null); }
  private leer(): Record<string, Aviso[]> {
    try { const d = JSON.parse(localStorage.getItem('cash_track_notifications') ?? '{}'); return d && typeof d === 'object' && !Array.isArray(d) ? d : {}; } catch { return {}; }
  }
  private guardar(): void {
    try { localStorage.setItem('cash_track_notifications', JSON.stringify(this.datos())); } catch {}
  }
}
