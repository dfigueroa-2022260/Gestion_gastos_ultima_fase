import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';
import { NotificationsService } from '../services/notifications.service';
import { environment } from '../../../environments/environment';

export const notificationInterceptor: HttpInterceptorFn = (req, next) => {
  const usuario = inject(AuthService).usuario()?.id;
  const avisos = inject(NotificationsService);
  const ruta = req.url.startsWith(environment.apiUrl + '/') ? req.url.slice(environment.apiUrl.length + 1).split(/[/?]/)[0] : '';
  const nombres: Record<string, string> = { gastos: 'Egreso', ingresos: 'Ingreso', ahorros: 'Ahorro', metas: 'Meta', planes: 'Plan financiero' };
  return next(req).pipe(tap(event => {
    if (!(event instanceof HttpResponse) || !usuario || !nombres[ruta] || !['POST','PUT','PATCH','DELETE'].includes(req.method)) return;
    const body = event.body as { monto?: number; descripcion?: string; nombre?: string; tipo?: string } | null;
    const accion = req.method === 'POST' ? 'registrado' : req.method === 'DELETE' ? 'eliminado' : 'actualizado';
    const nombre = ruta === 'ahorros' && body?.tipo === 'RETIRO' ? 'Retiro de ahorro' : nombres[ruta];
    const monto = body?.monto != null ? ' · Q' + Number(body.monto).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    const descripcion = body?.descripcion || body?.nombre;
    avisos.agregar(usuario, `${nombre} ${accion}${monto}${descripcion ? ' · ' + descripcion : ''}`);
  }));
};
