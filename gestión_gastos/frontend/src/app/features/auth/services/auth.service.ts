import { Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { decodeJwtPayload } from '../../../core/utils/jwt.util';
import {
  AuthResponse,
  LoginRequest,
  MensajeResponse,
  OlvidePasswordRequest,
  RegistroRequest,
  ResetPasswordRequest,
  Usuario,
} from '../models/auth.models';

const TOKEN_KEY = 'cash_track_token';
const USUARIO_KEY = 'cash_track_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  readonly usuario = signal<Usuario | null>(this.leerUsuarioGuardado());

  // Se activa cuando el token expira (por timer local o por un 401 del backend).
  // La UI (app.component) escucha este signal para mostrar el aviso.
  readonly sesionExpirada = signal(false);

  private temporizadorExpiracion: ReturnType<typeof setTimeout> | null = null;

  private readonly inactividadMs = 15 * 60 * 1000;
  private ultimaActividad = Date.now();
  private renovando = false;
  private temporizadorInactividad: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly http: HttpClient, router: Router) {
    const guardada = Number(localStorage.getItem('cash_track_actividad'));
    this.ultimaActividad = guardada || Date.now();
    for (const evento of ['pointerdown', 'keydown', 'scroll', 'touchstart']) {
      window.addEventListener(evento, () => this.registrarActividad(), {passive:true});
    }
    router.events.subscribe(e => { if (e instanceof NavigationEnd) this.registrarActividad(); });
    window.addEventListener('storage', e => {
      if (e.key === 'cash_track_actividad' && e.newValue) { this.ultimaActividad = Number(e.newValue); this.programarInactividad(); }
      if (e.key === TOKEN_KEY && !e.newValue) this.logout();
      if (e.key === TOKEN_KEY && e.newValue) this.programarExpiracion(e.newValue);
    });
    this.programarInactividad();
    // Si ya habia una sesion guardada (ej. recargaste la pagina), reprograma
    // el vencimiento en base al tiempo que le queda al token real.
    const token = this.obtenerToken();
    if (token) {
      this.programarExpiracion(token);
    }
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, data)
      .pipe(tap((res) => this.guardarSesion(res)));
  }

  configGoogle(): Observable<{ clientId: string | null; challenge?: string }> {
    return this.http.get<{ clientId: string | null; challenge?: string }>(this.baseUrl + '/google/config');
  }

  loginGoogle(credential: string, challenge: string, password?: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.baseUrl + '/google', { credential, challenge, password }).pipe(tap(res => this.guardarSesion(res)));
  }

  registro(data: RegistroRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/registro`, data)
      .pipe(tap((res) => this.guardarSesion(res)));
  }

  olvidePassword(data: OlvidePasswordRequest): Observable<MensajeResponse> {
    return this.http.post<MensajeResponse>(`${this.baseUrl}/olvide-password`, data);
  }

  resetPassword(data: ResetPasswordRequest): Observable<MensajeResponse> {
    return this.http.post<MensajeResponse>(`${this.baseUrl}/reset-password`, data);
  }

  logout(): void {
    this.cancelarTemporizador();
    if(this.temporizadorInactividad) clearTimeout(this.temporizadorInactividad);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    this.usuario.set(null);
  }

  /**
   * Cierra la sesion Y muestra el aviso de "tu sesion expiro". Se llama
   * desde el timer local o desde el interceptor cuando el backend responde
   * 401 a una ruta protegida.
   */
  expirarSesion(): void {
    if (!this.usuario() && !this.obtenerToken()) {
      return; // ya estaba deslogueado, evita mostrar el aviso de nuevo
    }
    this.logout();
    this.sesionExpirada.set(true);
  }

  cerrarAvisoExpiracion(): void {
    this.sesionExpirada.set(false);
  }

  obtenerToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  estaAutenticado(): boolean {
    return !!this.obtenerToken();
  }

  esAdmin(): boolean {
    return this.usuario()?.rol === 'ADMIN';
  }

  private guardarSesion(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(res.usuario));
    this.usuario.set(res.usuario);
    this.sesionExpirada.set(false);
    this.ultimaActividad = Date.now();
    localStorage.setItem("cash_track_actividad", String(this.ultimaActividad));
    this.programarInactividad();
    this.programarExpiracion(res.token);
  }

  private registrarActividad(): void {
    const token = this.obtenerToken();
    if (!token) return;
    if(Date.now() - this.ultimaActividad >= this.inactividadMs) { this.expirarSesion(); return; }
    this.ultimaActividad = Date.now();
    localStorage.setItem('cash_track_actividad', String(this.ultimaActividad));
    this.programarInactividad();
    const exp = decodeJwtPayload(token)?.exp;
    if(exp && exp * 1000 - Date.now() < 5 * 60 * 1000 && !this.renovando) {
      this.renovando = true;
      this.http.post<{token:string}>(this.baseUrl + '/renovar', {}).subscribe({
        next: res => { this.renovando = false; if (!this.obtenerToken()) return; localStorage.setItem(TOKEN_KEY,res.token); this.programarExpiracion(res.token); },
        error: () => { this.renovando = false; }
      });
    }
  }
  private programarInactividad(): void {
    if(this.temporizadorInactividad) clearTimeout(this.temporizadorInactividad);
    if(!this.obtenerToken()) return;
    const restante = this.inactividadMs - (Date.now() - this.ultimaActividad);
    if(restante <= 0) { this.expirarSesion(); return; }
    this.temporizadorInactividad = setTimeout(() => this.expirarSesion(), restante);
  }

  private leerUsuarioGuardado(): Usuario | null {
    const raw = localStorage.getItem(USUARIO_KEY);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  }

  /**
   * Lee el campo `exp` real del JWT (viene firmado por el backend segun
   * JWT_EXPIRES_IN, no hay ningun numero de minutos fijo aca) y programa
   * el cierre automatico de sesion para ese momento exacto.
   */
  private programarExpiracion(token: string): void {
    this.cancelarTemporizador();

    const payload = decodeJwtPayload(token);
    if (!payload?.exp) {
      return;
    }

    const msRestantes = payload.exp * 1000 - Date.now();

    if (msRestantes <= 0) {
      this.expirarSesion();
      return;
    }

    this.temporizadorExpiracion = setTimeout(() => this.expirarSesion(), msRestantes);
  }

  private cancelarTemporizador(): void {
    if (this.temporizadorExpiracion) {
      clearTimeout(this.temporizadorExpiracion);
      this.temporizadorExpiracion = null;
    }
  }
}
