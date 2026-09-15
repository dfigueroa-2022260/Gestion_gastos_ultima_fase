import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

interface GoogleIdentity {
  accounts: { id: {
    initialize(options: { client_id: string; nonce: string; auto_select: boolean; callback: (response: {credential: string}) => void }): void;
    renderButton(element: HTMLElement, options: { theme: string; size: string; text: string; shape: string; locale: string; width: number }): void;
  } };
}
let googleScript: Promise<GoogleIdentity> | undefined;
function cargarGoogle(): Promise<GoogleIdentity> {
  const google = () => (window as Window & { google?: GoogleIdentity }).google;
  if (google()) return Promise.resolve(google()!);
  return googleScript ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => { script.remove(); googleScript = undefined; reject(new Error('Timeout')); }, 15000);
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    script.onload = () => { clearTimeout(timeout); if (google()) resolve(google()!); else { googleScript = undefined; reject(new Error('Google unavailable')); } };
    script.onerror = () => { clearTimeout(timeout); script.remove(); googleScript = undefined; reject(new Error('Google unavailable')); };
    document.head.appendChild(script);
  });
}

@Component({
  selector: 'app-google-login', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <div #googleButton class="google-button" [class.busy]="cargando()" [attr.inert]="cargando() ? '' : null"></div>
    <button *ngIf="!listo()" type="button" class="google-fallback" [disabled]="iniciando()" (click)="inicializar()"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.97-3.38.97-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 13.93A6 6 0 0 1 6.09 12c0-.67.11-1.32.31-1.93V7.48H3.06A10 10 0 0 0 2 12c0 1.61.38 3.14 1.06 4.52z"/><path fill="#EA4335" d="M12 5.95c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.34 2.59C7.19 7.71 9.4 5.95 12 5.95z"/></svg>Registrarse con Google</button>
    <p class="status" role="status" *ngIf="cargando()">Verificando tu cuenta...</p>
    <p class="error" role="alert" *ngIf="error()">{{error()}}</p>
    <form *ngIf="vincular()" (ngSubmit)="confirmarVinculo()">
      <label for="google-local-password">Contraseña de tu cuenta en Cash Track</label>
      <input id="google-local-password" name="googlePassword" type="password" autocomplete="current-password" [(ngModel)]="passwordLocal" required />
      <div class="actions"><button type="submit" [disabled]="cargando()">Vincular y entrar</button><button type="button" [disabled]="cargando()" (click)="cancelarVinculo()">Cancelar</button></div>
    </form>
  `,
  styles: [`
    :host { display: block; margin-top: 16px; }
    .separator { display: flex; align-items: center; gap: 12px; color: #7a746a; font-size: 12px; margin-bottom: 14px; }
    .separator::before,.separator::after { content: ''; flex: 1; height: 1px; background: #e7ddc9; }
    .google-button { display: flex; justify-content: center; min-width: 0; }
    .busy { opacity: .6; pointer-events: none; }
    .google-fallback { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; background: #fff; color: #3c4043; border: 1px solid #dadce0; border-radius: 8px; padding: 12px 16px; font: inherit; font-size: 14px; cursor: pointer; }
    .google-letter { font-family: Arial,sans-serif; font-size: 20px; font-weight: 700; color: #4285f4; }
    .error,.status { font-size: 12px; line-height: 1.5; margin: 10px 0; color: #7a746a; } .error { color: #b33c2d; }
    label { display: block; font-size: 12px; margin: 12px 0 6px; } input { width: 100%; box-sizing: border-box; border: 1px solid #e7ddc9; border-radius: 8px; background: #fbf7ee; padding: 11px; font: inherit; }
    .actions { display: flex; gap: 8px; margin-top: 10px; } .actions button { padding: 10px 14px; border: 0; border-radius: 999px; background: #2b2a28; color: #fff; font: inherit; font-size: 12px; cursor: pointer; } button:disabled { opacity: .6; cursor: default; }
  `],
})
export class GoogleLoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('googleButton', {static:true}) private button!: ElementRef<HTMLElement>;
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private destroyed = false;
  private credential = '';
  private challenge = '';
  readonly iniciando = signal(false);
  readonly cargando = signal(false);
  readonly listo = signal(false);
  readonly error = signal('');
  readonly vincular = signal(false);
  passwordLocal = '';
  ngAfterViewInit(): void { this.inicializar(true); }
  ngOnDestroy(): void { this.destroyed = true; this.credential = ''; this.passwordLocal = ''; }
  inicializar(silencioso = false): void {
    if (this.iniciando()) return;
    this.iniciando.set(true); this.error.set('');
    this.auth.configGoogle().subscribe({
      next: async config => {
        if (this.destroyed) return;
        if (!config.clientId || !config.challenge) {
          this.iniciando.set(false);
          if (!silencioso) this.error.set('El acceso con Google todavía no está habilitado. Podés entrar con tu correo y contraseña.');
          return;
        }
        this.challenge = config.challenge;
        try {
          const google = await cargarGoogle();
          if (this.destroyed) return;
          google.accounts.id.initialize({ client_id: config.clientId, nonce: config.challenge, auto_select: false,
            callback: response => this.zone.run(() => { if (!this.destroyed && !this.cargando()) { this.credential = response.credential; this.enviar(); } }),
          });
          this.button.nativeElement.replaceChildren();
          google.accounts.id.renderButton(this.button.nativeElement, {theme:'outline',size:'large',text:'signup_with',shape:'rectangular',locale:'es',width:Math.min(400, this.button.nativeElement.clientWidth || 280)});
          this.listo.set(true);
        } catch { this.error.set('No se pudo cargar Google. Revisá tu conexión e intentá de nuevo.'); }
        finally { this.iniciando.set(false); }
      },
      error: () => { this.iniciando.set(false); if (!silencioso) this.error.set('No se pudo conectar con Google. Intentá de nuevo más tarde.'); },
    });
  }
  confirmarVinculo(): void { if (this.passwordLocal && !this.cargando()) this.enviar(this.passwordLocal); }
  cancelarVinculo(): void { this.vincular.set(false); this.passwordLocal = ''; this.credential = ''; this.error.set(''); }
  private enviar(password?: string): void {
    this.cargando.set(true); this.error.set('');
    this.auth.loginGoogle(this.credential, this.challenge, password).subscribe({
      next: () => { this.cargando.set(false); this.credential = ''; this.passwordLocal = ''; if (!this.destroyed) this.router.navigate(['/gastos']); },
      error: err => {
        this.cargando.set(false); this.passwordLocal = '';
        if (err?.error?.code === 'GOOGLE_LINK_REQUIRED') this.vincular.set(true);
        this.error.set(err?.error?.error ?? 'No se pudo iniciar sesión con Google.');
      },
    });
  }
}
