const fs=require('fs'),path=require('path');
const read=p=>fs.readFileSync(p,'utf8').replaceAll('\r\n','\n');
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s)};
const edit=(p,f)=>write(p,f(read(p)));

// Sliding inactivity timeout, independent from the signed token lifetime.
edit('frontend/src/app/features/auth/services/auth.service.ts',s=>s.replace("import { HttpClient }", "import { Router, NavigationEnd } from '@angular/router';\nimport { HttpClient }").replace('  constructor(private readonly http: HttpClient) {',`  private readonly inactividadMs = 15 * 60 * 1000;
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
    this.programarInactividad();`).replace('    this.cancelarTemporizador();\n    localStorage.removeItem', '    this.cancelarTemporizador();\n    if(this.temporizadorInactividad) clearTimeout(this.temporizadorInactividad);\n    localStorage.removeItem').replace('    this.programarExpiracion(res.token);','    this.ultimaActividad = Date.now();\n    localStorage.setItem("cash_track_actividad", String(this.ultimaActividad));\n    this.programarInactividad();\n    this.programarExpiracion(res.token);').replace('  private leerUsuarioGuardado()',`  private registrarActividad(): void {
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

  private leerUsuarioGuardado()`));
edit('backend/src/modules/auth/auth.routes.ts',s=>`import { authMiddleware } from '../../middlewares/auth.middleware';
import { generarToken } from '../../utils/jwt.util';
`+s.replace('const router = Router();',`const router = Router();
router.post('/renovar', authMiddleware, (req, res) => {
  res.json({token: generarToken({usuarioId:req.usuarioId!, rol:req.usuarioRol!})});
});`));
edit('frontend/src/app/shared/session-expired-modal/session-expired-modal.component.html',s=>s.replace('Por seguridad, cerramos tu sesion por inactividad.','Tu sesión terminó por inactividad o vencimiento.'));

// Categories: date filters apply to spending, preserving the category hierarchy.
edit('frontend/src/app/features/gastos/categorias-page/categorias-page.component.ts',s=>`import { TopFiltersComponent, RangoFechas } from '../../../shared/top-filters/top-filters.component';
import { enRango, resumir } from '../../../shared/registro.utils';
import { Gasto } from '../gastos-page/gasto.models';
`+s.replace('imports: [','imports: [TopFiltersComponent, ').replace('readonly resumenGastos = signal<ResumenCategoria[]>([]);',`readonly rango = signal<RangoFechas>({desde:null,hasta:null,etiqueta:'Todo'});
  readonly movimientos = signal<Gasto[]>([]);
  readonly resumenGastos = computed(() => resumir(this.movimientos().filter(g => enRango(g.fecha,this.rango()))));
  onRango(r: RangoFechas): void { this.rango.set(r); }`).replace('this.gastoService.resumen().subscribe({ next: (r) => this.resumenGastos.set(r) });','this.gastoService.listar().subscribe({ next: (r) => this.movimientos.set(r), error: () => this.error.set("No se pudieron cargar los movimientos.") });'));
for(const name of ['categorias','metas','etiquetas'])edit(`frontend/src/app/features/gastos/${name}-page/${name}-page.component.html`,s=>s.replace(/<div class="content-actions">[\s\S]*?<\/div>/,'<app-top-filters (rangoChange)="onRango($event)"></app-top-filters>'));
edit('frontend/src/app/features/gastos/etiquetas-page/etiqueta.models.ts',s=>s.replace('  id: string;', '  id: string;\n  createdAt: string;'));
edit('frontend/src/app/features/gastos/etiquetas-page/etiquetas-page.component.ts',s=>`import { TopFiltersComponent, RangoFechas } from '../../../shared/top-filters/top-filters.component';
import { enRango, hoyLocal } from '../../../shared/registro.utils';
`+s.replace('imports: [','imports: [TopFiltersComponent, ').replace('readonly etiquetas = signal<Etiqueta[]>([]);',`readonly etiquetas = signal<Etiqueta[]>([]);
  readonly rango = signal<RangoFechas>({desde:null,hasta:null,etiqueta:'Todo'});
  onRango(r: RangoFechas): void { this.rango.set(r); }
  seleccionarDia(dia: number | null): void {
    if(!dia) return;
    const f = hoyLocal(new Date(this.mesCalendario().getFullYear(),this.mesCalendario().getMonth(),dia));
    this.onRango({desde:f,hasta:f,etiqueta:f});
  }`).replace('!e.etiquetaPadreId)', '!e.etiquetaPadreId && (enRango(e.createdAt,this.rango()) || this.etiquetas().some(sub => sub.etiquetaPadreId === e.id && enRango(sub.createdAt,this.rango()))))'));
edit('frontend/src/app/features/gastos/etiquetas-page/etiquetas-page.component.html',s=>s.replace('class="dia-celda"','class="dia-celda" role="button" tabindex="0" (click)="seleccionarDia(dia)" (keydown.enter)="seleccionarDia(dia)"'));

// Goal icons and real savings trend for any selected period, including one point.
edit('frontend/src/app/features/gastos/metas-page/meta.models.ts',s=>s.replace('  id: string;','  id: string;\n  createdAt: string;'));
edit('frontend/src/app/features/gastos/metas-page/metas-page.component.ts',s=>`import { TopFiltersComponent, RangoFechas } from '../../../shared/top-filters/top-filters.component';
import { enRango } from '../../../shared/registro.utils';
`+s.replace('imports: [','imports: [TopFiltersComponent, ').replace('interface MetaForm {','interface MetaForm {\n  icono: FormControl<string>;').replace('readonly metas = signal<Meta[]>([]);',`readonly metasTodas = signal<Meta[]>([]);
  readonly metas = computed(() => this.metasTodas().filter(m => enRango(m.createdAt, this.rango())));
  readonly rango = signal<RangoFechas>({desde:null,hasta:null,etiqueta:'Todo'});
  readonly iconos = ['🎯','🏠','🚗','✈️','🎓','💻','💰','❤️'];
  onRango(r: RangoFechas): void { this.rango.set(r); this.cargarTendencia(); }`).replaceAll('this.metas.set(', 'this.metasTodas.set(').replaceAll('this.metas.update(', 'this.metasTodas.update(').replace("nombre: ['', [Validators.required", "icono: ['🎯'],\n      nombre: ['', [Validators.required").replace('for (const a of ahorros) {','for (const a of ahorros.filter(a => enRango(a.fecha,this.rango()))) {').replace('        nombre: raw.nombre,','        nombre: raw.nombre,\n        icono: raw.icono,').replace("            nombre: '',","            nombre: '',\n            icono: '🎯',").replace('if (!input || isNaN(monto) || monto <= 0) return;',"if(input === null) return;\n    if (!Number.isFinite(monto) || monto < 0.01) { this.error.set('El aporte debe ser mayor a 0.'); return; }").replace('this.form.markAllAsTouched();\n      return;',"this.form.markAllAsTouched();\n      this.errorForm.set('Completa el nombre y un monto objetivo mayor a 0.');\n      return;").replace('        this.tendencia.set(puntos.slice(-8));\n      },','        this.tendencia.set(puntos.slice(-8));\n      },\n      error: () => this.error.set("No se pudo cargar la tendencia de ahorro."),'));
edit('frontend/src/app/features/gastos/metas-page/metas-page.component.html',s=>s.replace(/<span class="meta-icon">[\s\S]*?<\/span>/,'<span class="meta-icon">{{ iconos.includes(m.icono) ? m.icono : "🎯" }}</span>').replace('<label for="nombreMeta">','<label for="iconoMeta">Icono de la meta</label><select id="iconoMeta" formControlName="icono"><option *ngFor="let icono of iconos" [value]="icono">{{icono}}</option></select>\n      <label for="nombreMeta">').replace('tendencia().length > 1','tendencia().length > 0').replace('<text [attr.x]="30 + i * 55" y="196"','<circle [attr.cx]="30 + i * 55" [attr.cy]="yPunto(p.total)" r="4" fill="var(--d-accent)"><title>Q{{p.total | number: \'1.2-2\'}}</title></circle>\n      <text [attr.x]="30 + i * 55" y="196"').replace('prevision de cumplimiento','Ahorro neto acumulado del período').replace('en al menos 2 meses distintos','para el período seleccionado'));
edit('frontend/src/app/features/gastos/ahorro-page/ahorro-page.component.scss',s=>s+`\n.ahorro-acciones-grid {gap:12px;align-items:center;}\n.ahorro-acciones-grid a.btn-primary {display:flex;align-items:center;justify-content:center;border-radius:999px;padding:12px 20px;text-decoration:none;box-sizing:border-box;}\n`);
for(const name of ['gastos/gastos-page/gastos-page','ingresos/ingresos','gastos/ahorro-page/ahorro-page'])edit(`frontend/src/app/features/${name}.component.html`,s=>s.replace('min="0"','min="0.01"'));

// Real account/budget persistence, scoped to authenticated users.
edit('backend/prisma/schema.prisma',s=>s.replace('  metas          Meta[]','  metas          Meta[]\n  planes         PlanFinanciero[]')+`
model PlanFinanciero {
  id String @id @default(uuid())
  tipo String
  nombre String
  monto Decimal @db.Decimal(10, 2)
  fecha DateTime?
  usuarioId String
  usuario Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  @@map("planes_financieros")
}
`);
write('backend/prisma/migrations/20260915050000_planes_financieros/migration.sql',`CREATE TABLE "planes_financieros" (
 "id" TEXT NOT NULL, "tipo" TEXT NOT NULL, "nombre" TEXT NOT NULL,
 "monto" DECIMAL(10,2) NOT NULL CHECK ("monto" > 0), "fecha" TIMESTAMP(3),
 "usuarioId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "planes_financieros_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "planes_financieros_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
`);
write('backend/src/modules/planes/plan.routes.ts',`import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../utils/AppError';
import { montoRegistro } from '../../utils/registro.schema';
const router = Router();
router.use(authMiddleware);
const schema = z.object({tipo:z.enum(['CUENTA','PROXIMO','PRESUPUESTO']), nombre:z.string().trim().min(1,'La descripción es obligatoria'),monto:montoRegistro,fecha:z.coerce.date().optional()}).refine(d=> d.tipo === 'CUENTA' || !!d.fecha, 'Selecciona una fecha para el presupuesto o gasto próximo');
router.get('/',asyncHandler(async(req,res)=>{res.json(await prisma.planFinanciero.findMany({where:{usuarioId:req.usuarioId!},orderBy:{createdAt:'desc'}}));}));
router.post('/',validate(schema),asyncHandler(async(req,res)=>{res.status(201).json(await prisma.planFinanciero.create({data:{...req.body,usuarioId:req.usuarioId!}}));}));
router.delete('/:id',asyncHandler(async(req,res)=>{const r=await prisma.planFinanciero.deleteMany({where:{id:req.params.id,usuarioId:req.usuarioId!}});if(!r.count)throw new AppError('Registro no encontrado',404);res.status(204).send();}));
export default router;
`);
edit('backend/src/app.ts',s=>"import planRoutes from './modules/planes/plan.routes';\n"+s.replace('app.use("/api/metas", metaRoutes);','app.use("/api/metas", metaRoutes);\napp.use("/api/planes", planRoutes);'));
write('frontend/src/app/features/gastos/resumen-page/plan.service.ts',`import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
export interface Plan {id:string;tipo:'CUENTA'|'PROXIMO'|'PRESUPUESTO';nombre:string;monto:number;fecha:string|null;}
@Injectable({providedIn:'root'})
export class PlanService {
 private readonly http=inject(HttpClient); private readonly url=environment.apiUrl+'/planes';
 listar(){return this.http.get<Plan[]>(this.url);}
 crear(data:Omit<Plan,'id'|'fecha'> & {fecha?:string}){return this.http.post<Plan>(this.url,data);}
 eliminar(id:string){return this.http.delete<void>(this.url+'/'+id);}
}
`);
edit('frontend/src/app/features/gastos/resumen-page/resumen-page.component.ts',s=>`import { inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Plan, PlanService } from './plan.service';
import { DialogService } from '../../../shared/dialog.service';
import { hoyLocal } from '../../../shared/registro.utils';
`+s.replace('imports: [','imports: [FormsModule, ').replace(/  \/\/ Ejemplo[\s\S]*?  readonly mesCalendario/,`  readonly planService = inject(PlanService);
  readonly dialog = inject(DialogService);
  readonly planes = signal<Plan[]>([]);
  readonly cuentas = computed(() => this.planes().filter(p=>p.tipo==='CUENTA'));
  readonly proximos = computed(() => this.planes().filter(p=>p.tipo==='PROXIMO' && enRango(p.fecha!,this.rango())));
  readonly presupuestos = computed(() => this.planes().filter(p=>p.tipo==='PRESUPUESTO' && enRango(p.fecha!,this.rango())));
  readonly error = signal('');
  readonly guardandoPlan = signal(false);
  readonly tipoPlan = signal<Plan['tipo'] | null>(null);
  nombrePlan=''; montoPlan:number|null=null; fechaPlan='';
  abrirPlan(tipo:Plan['tipo']):void {this.tipoPlan.set(tipo);this.nombrePlan='';this.montoPlan=null;this.fechaPlan=hoyLocal();this.error.set('');}
  guardarPlan():void {
    const tipo=this.tipoPlan(); const monto=Number(this.montoPlan);
    if(!tipo || !this.nombrePlan.trim() || !Number.isFinite(monto) || monto<0.01 || (tipo!=='CUENTA' && !this.fechaPlan)) {this.error.set('Ingresa una descripción, un monto mayor a 0 y la fecha del plan.');return;}
    this.guardandoPlan.set(true);
    this.planService.crear({tipo,nombre:this.nombrePlan.trim(),monto,fecha:tipo==='CUENTA'?undefined:this.fechaPlan}).subscribe({next:p=>{this.planes.update(a=>[p,...a]);this.tipoPlan.set(null);this.guardandoPlan.set(false);},error:e=>{this.error.set(e?.error?.error ?? 'No se pudo guardar el plan.');this.guardandoPlan.set(false);}});
  }
  async eliminarPlan(p:Plan):Promise<void>{if(!await this.dialog.confirm('¿Eliminar '+p.nombre+'?'))return;this.planService.eliminar(p.id).subscribe({next:()=>this.planes.update(a=>a.filter(x=>x.id!==p.id)),error:()=>this.error.set('No se pudo eliminar el plan.')});}
  gastoPresupuesto(p:Plan):number {return this.gastosTodos().filter(g=>g.fecha.slice(0,7)===p.fecha?.slice(0,7)).reduce((s,g)=>s+Number(g.monto),0);}
  seleccionarDia(dia:number|null):void {if(!dia)return;const f=hoyLocal(new Date(this.mesCalendario().getFullYear(),this.mesCalendario().getMonth(),dia));this.onRango({desde:f,hasta:f,etiqueta:f});}
  readonly mesCalendario`).replace('  ngOnInit(): void {','  ngOnInit(): void {\n    this.planService.listar().subscribe({next:p=>this.planes.set(p),error:()=>this.error.set("No se pudieron cargar las cuentas y presupuestos.")});').replace('NOMBRES_MES[this.mesCalendario().getMonth()].toUpperCase()',"NOMBRES_MES[this.mesCalendario().getMonth()].toUpperCase() + ' ' + this.mesCalendario().getFullYear()"));
edit('frontend/src/app/features/gastos/resumen-page/resumen-page.component.html',s=>s.replace('cuentasEjemplo','cuentas()').replace('c.saldo','c.monto').replace('gastosProximosEjemplo','proximos()').replace('<h4>Saldos por cuenta</h4>','<h4>Saldos por cuenta</h4><button class="btn-primary" (click)="abrirPlan(\'CUENTA\')">Agregar cuenta</button>').replace('{{ c.nombre }}</span>','{{ c.nombre }}</span><button type="button" (click)="eliminarPlan(c)" aria-label="Eliminar cuenta">×</button>').replace('{{ g.nombre }}</span>','{{ g.nombre }} · {{g.fecha | date: \'dd/MM/yyyy\':\'UTC\'}}</span><button type="button" (click)="eliminarPlan(g)" aria-label="Eliminar gasto próximo">×</button>').replace('disabled title="Proximamente">Crear presupuesto','(click)="abrirPlan(\'PRESUPUESTO\')">Crear presupuesto').replace('disabled title="Proximamente">Añadir entrada','(click)="abrirPlan(\'PROXIMO\')">Añadir entrada').replace('class="dia-celda"','class="dia-celda" role="button" tabindex="0" (click)="seleccionarDia(dia)" (keydown.enter)="seleccionarDia(dia)"')+`
<p class="error-banner" role="alert" *ngIf="error()">{{error()}}</p>
<div class="form-card" *ngIf="tipoPlan()">
 <h3>{{tipoPlan()==='CUENTA'?'Agregar cuenta':tipoPlan()==='PROXIMO'?'Gasto próximo':'Crear presupuesto mensual'}}</h3>
 <form (ngSubmit)="guardarPlan()" class="form-grid">
 <label>Descripción <input name="nombrePlan" [(ngModel)]="nombrePlan" required /></label>
 <label>Monto <input name="montoPlan" type="number" min="0.01" step="0.01" [(ngModel)]="montoPlan" required /></label>
 <label *ngIf="tipoPlan()!=='CUENTA'">Fecha <input name="fechaPlan" type="date" [(ngModel)]="fechaPlan" required /></label>
 <button class="btn-primary" [disabled]="guardandoPlan()">Guardar</button><button type="button" class="btn-secondary" (click)="tipoPlan.set(null)">Cancelar</button>
 </form>
</div>
<div class="chart-card"><h3>Presupuestos mensuales</h3><p *ngIf="!presupuestos().length">Todavía no hay presupuestos en este período.</p>
 <div class="mini-row" *ngFor="let p of presupuestos()"><span>{{p.nombre}} · {{p.fecha | date:'MM/yyyy':'UTC'}} · Gastado Q{{gastoPresupuesto(p) | number:'1.2-2'}} de Q{{p.monto | number:'1.2-2'}} · Disponible Q{{+p.monto-gastoPresupuesto(p) | number:'1.2-2'}}</span><button (click)="eliminarPlan(p)">Eliminar</button></div>
</div>
<div class="chart-card"><h3>Registros del período seleccionado</h3>
 <p *ngIf="!gastos().length && !ingresos().length && !ahorros().length">No hay movimientos en este período.</p>
 <p *ngFor="let g of gastos()">{{g.fecha | date:'dd/MM/yyyy':'UTC'}} · Gasto · {{g.descripcion}} · Q{{g.monto | number:'1.2-2'}}</p>
 <p *ngFor="let i of ingresos()">{{i.fecha | date:'dd/MM/yyyy':'UTC'}} · Ingreso · {{i.descripcion}} · Q{{i.monto | number:'1.2-2'}}</p>
 <p *ngFor="let a of ahorros()">{{a.fecha | date:'dd/MM/yyyy':'UTC'}} · Ahorro {{a.tipo}} · {{a.descripcion}} · Q{{a.monto | number:'1.2-2'}}</p>
</div>
`);
