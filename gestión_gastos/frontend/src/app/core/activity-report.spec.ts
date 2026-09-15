import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AuthService } from '../features/auth/services/auth.service';
import { PreferencesService } from './services/preferences.service';
import { NotificationsService } from './services/notifications.service';
import { notificationInterceptor } from './interceptors/notification.interceptor';
import { environment } from '../../environments/environment';
import { ReportesPageComponent } from '../features/gastos/reportes-page/reportes-page.component';
import { GastoService } from '../features/gastos/gastos-page/gasto.service';
import { IngresoService } from '../features/ingresos/services/ingreso.service';
import { AhorroService } from '../features/gastos/ahorro-page/ahorro.service';

describe('Configuración y notificaciones de movimientos', () => {
  const usuario = signal<{id: string} | null>({id:'prueba-a'});
  beforeEach(() => {
    localStorage.removeItem('cash_track_notifications');
    localStorage.removeItem('cash_track_alerts');
    localStorage.removeItem('cash_track_theme');
    usuario.set({id:'prueba-a'});
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: { usuario } },
      provideHttpClient(withInterceptors([notificationInterceptor])), provideHttpClientTesting()
    ] });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    document.documentElement.classList.remove('dark-theme');
    document.documentElement.style.colorScheme = '';
  });
  it('guarda el tema y lo aplica al documento', () => {
    const p = TestBed.inject(PreferencesService);
    p.tema(true);
    expect(document.documentElement.classList.contains('dark-theme')).toBeTrue();
    expect(localStorage.getItem('cash_track_theme')).toBe('dark');
    p.tema(false);
    expect(document.documentElement.classList.contains('dark-theme')).toBeFalse();
  });
  it('avisa solo después de guardar, permite leer y aísla las cuentas', fakeAsync(() => {
    const http = TestBed.inject(HttpClient), mock = TestBed.inject(HttpTestingController);
    const n = TestBed.inject(NotificationsService);
    http.post(environment.apiUrl+'/ingresos', {monto:100}).subscribe();
    expect(n.lista().length).toBe(0);
    mock.expectOne(environment.apiUrl+'/ingresos').flush({monto:100,descripcion:'Salario'});
    expect(n.pendientes()).toBe(1);
    expect(n.toast()).toContain('Ingreso registrado');
    n.marcarLeidas(); expect(n.pendientes()).toBe(0);
    usuario.set({id:'prueba-b'});
    expect(n.lista()).toEqual([]); expect(n.toast()).toBeNull();
    usuario.set({id:'prueba-a'}); expect(n.lista().length).toBe(1);
    tick(5000); expect(n.toast()).toBeNull();
  }));
  it('no anuncia errores, lecturas ni movimientos con avisos desactivados', () => {
    const http = TestBed.inject(HttpClient), mock = TestBed.inject(HttpTestingController);
    const n = TestBed.inject(NotificationsService);
    http.post(environment.apiUrl+'/gastos', {}).subscribe({error:()=>{}});
    mock.expectOne(environment.apiUrl+'/gastos').flush({}, {status:422,statusText:'Invalid'});
    http.get(environment.apiUrl+'/ingresos').subscribe();
    mock.expectOne(environment.apiUrl+'/ingresos').flush([]);
    TestBed.inject(PreferencesService).notificaciones(false);
    http.post(environment.apiUrl+'/ahorros', {}).subscribe();
    mock.expectOne(environment.apiUrl+'/ahorros').flush({monto:20});
    expect(n.lista()).toEqual([]);
  });
});

describe('Filtros y gráficas de reportes', () => {
  function reporte(): ReportesPageComponent {
    const categoria = {id:'c1',nombre:'Trabajo',color:'#e2672e'};
    const base = {id:'r1',categoriaId:'c1',categoria,descripcion:'Salario',fecha:'2026-09-14T12:00:00Z'};
    const c = new ReportesPageComponent(
      {listar:()=>of([{...base,monto:50,descripcion:'Comida'}])} as unknown as GastoService,
      {listar:()=>of([{...base,monto:100}])} as unknown as IngresoService,
      {listar:()=>of([{...base,monto:30,tipo:'RETIRO'}])} as unknown as AhorroService
    );
    c.ngOnInit(); return c;
  }
  it('combina tipo, categoría, texto, monto y fecha en los totales', () => {
    const c = reporte();
    expect(c.totalIngresos()).toBe(100); expect(c.totalGastos()).toBe(50);
    c.tipo.set('ingresos'); c.categoria.set('c1'); c.busqueda.set('SAL'); c.minimo.set(90); c.maximo.set(110);
    expect(c.totalIngresos()).toBe(100); expect(c.totalGastos()).toBe(0);
    c.maximo.set(80); expect(c.rangoMontoInvalido()).toBeTrue(); expect(c.totalIngresos()).toBe(0);
    c.limpiarFiltros(); expect(c.totalGastos()).toBe(50);
    c.onRango({desde:'2026-10-01',hasta:null,etiqueta:'Octubre'}); expect(c.totalIngresos()).toBe(0);
  });
  it('incluye retiros de ahorro y dibuja barras negativas dentro del gráfico', () => {
    const c = reporte(); c.tipo.set('ahorros');
    expect(c.totalAhorros()).toBe(-30); expect(c.datosPorMes()[0].ahorro).toBe(-30);
    expect(c.alturaBarra(-30)).toBeGreaterThan(0);
    expect(c.yBarra(-30)).toBeGreaterThanOrEqual(40);
    expect(c.yBarra(-30)+c.alturaBarra(-30)).toBeLessThanOrEqual(200);
  });
});
