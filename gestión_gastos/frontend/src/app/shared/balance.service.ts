import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export interface Saldo { disponible: number; ahorro: number; deficitDisponible: number; deficitAhorro: number; }
@Injectable()
export class BalanceService {
  private readonly http = inject(HttpClient);
  readonly datos = signal<Saldo | null>(null);
  readonly error = signal('');
  readonly cargando = signal(false);
  private version = 0;

  cargar(hasta?: string | null): void {
    const version = ++this.version;
    this.cargando.set(true);
    this.error.set('');
    this.datos.set(null);
    this.http.get<Saldo>(environment.apiUrl + '/balance', { params: hasta ? { hasta } : {} }).subscribe({
      next: saldo => { if (version !== this.version) return; this.datos.set(saldo); this.cargando.set(false); },
      error: () => { if (version !== this.version) return; this.error.set('No se pudo consultar el saldo. Recarga la página para volver a intentarlo.'); this.cargando.set(false); },
    });
  }
}
