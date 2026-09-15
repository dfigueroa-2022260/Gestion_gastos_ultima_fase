from pathlib import Path
import re

root=Path('.')
def edit(p, fn):
 p=Path(p); p.write_text(fn(p.read_text(encoding='utf-8')),encoding='utf-8')
def write(p,s):
 p=Path(p); p.parent.mkdir(parents=True,exist_ok=True); p.write_text(s,encoding='utf-8')

write('backend/src/utils/registro.schema.ts','''import { z } from "zod";
export const montoRegistro = z.number().finite().min(0.01, "El monto debe ser mayor a 0").max(99999999.99, "El monto es demasiado grande");
export const descripcionRegistro = z.string().trim().min(1, "La descripción es obligatoria");
export const fechaRegistro = z.coerce.date().refine(fecha => {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' });
  return fecha.toISOString().slice(0, 10) <= hoy;
}, "No puedes registrar movimientos en una fecha futura");
''')
for mod in ['gastos/gasto','ingresos/ingreso','ahorros/ahorro']:
 edit(f'backend/src/modules/{mod}.schema.ts',lambda s: s.replace('import { z } from "zod";', 'import { z } from "zod";\nimport { montoRegistro, descripcionRegistro, fechaRegistro } from "../../utils/registro.schema";').replace('z.number().positive("El monto debe ser mayor a 0")','montoRegistro').replace('z.string().optional()','descripcionRegistro').replace('z.coerce.date().optional()','fechaRegistro.optional()'))

write('frontend/src/app/shared/registro.utils.ts','''import { ValidatorFn } from '@angular/forms';
export const hoyLocal = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const fechaPasada: ValidatorFn = c => !c.value || !/^\\d{4}-\\d{2}-\\d{2}$/.test(c.value) || c.value > hoyLocal() ? { fechaFutura: true } : null;
export const descripcionObligatoria: ValidatorFn = c => typeof c.value === 'string' && c.value.trim() ? null : { required: true };
export function enRango(fecha: string, rango: {desde: string | null; hasta: string | null}): boolean {
 const f = fecha.slice(0,10); return (!rango.desde || f >= rango.desde) && (!rango.hasta || f <= rango.hasta);
}
export function resumir(registros: {monto: number; categoriaId: string; categoria: {nombre: string; color: string}; tipo?: string}[]) {
 const mapa = new Map<string, {categoriaId: string; nombre: string; color: string; total: number}>();
 for (const r of registros.filter(r => r.tipo !== 'RETIRO')) {
  const c = mapa.get(r.categoriaId) ?? {categoriaId:r.categoriaId, nombre:r.categoria.nombre, color:r.categoria.color, total:0};
  c.total += Number(r.monto); mapa.set(r.categoriaId,c);
 }
 return [...mapa.values()];
}
''')

for p in Path('frontend/src/app/features').rglob('*.component.ts'):
 s=p.read_text(encoding='utf-8')
 # Sort months chronologically, including October and later; avoid UTC midnight shifting into the previous month.
 s=s.replace('${f.getMonth()}', "${String(f.getMonth()).padStart(2, '0')}")
 s=re.sub(r'new Date\((\w+)\.fecha\)',r"new Date(\1.fecha.slice(0, 10) + 'T12:00:00')",s)
 s=s.replace('new Date(fechaStr)', "new Date(fechaStr.slice(0, 10) + 'T12:00:00')")
 p.write_text(s,encoding='utf-8')

for path in ['gastos/gastos-page/gastos-page','ingresos/ingresos','gastos/ahorro-page/ahorro-page']:
 p=f'frontend/src/app/features/{path}.component.ts'
 rel='../../shared' if path=='ingresos/ingresos' else '../../../shared'
 edit(p,lambda s: f"import {{ hoyLocal, fechaPasada, descripcionObligatoria }} from '{rel}/registro.utils';\n"+s.replace("descripcion: [''],", "descripcion: ['', [descripcionObligatoria]],").replace('fecha: [this.hoyISO()],','fecha: [this.hoyISO(), [fechaPasada]],').replace('private hoyISO()', 'hoyISO()').replace('new Date().toISOString().slice(0, 10)','hoyLocal()').replace('this.form.markAllAsTouched();\n      return;', "this.form.markAllAsTouched();\n      this.errorForm.set('Revisa los campos: el monto debe ser mayor a 0, la descripción es obligatoria y la fecha no puede ser futura.');\n      return;",1).replace('raw.descripcion || undefined','raw.descripcion.trim()'))
 edit(p.replace('.ts','.html'),lambda s: s.replace('placeholder="Opcional"','placeholder="Descripción obligatoria" required').replace('type="date" formControlName="fecha"','type="date" [max]="hoyISO()" formControlName="fecha"').replace("date: 'dd/MM/yyyy'", "date: 'dd/MM/yyyy':'UTC'"))

# Shared in-app dialogs replace native browser dialogs everywhere.
write('frontend/src/app/shared/dialog.service.ts','''import { Injectable, signal } from '@angular/core';
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
''')
write('frontend/src/app/shared/dialog.component.ts','''import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService } from './dialog.service';
@Component({selector:'app-dialog',standalone:true,imports:[CommonModule,FormsModule],
 template:`<div class="overlay" *ngIf="dialog.estado() as e" (keydown.escape)="dialog.cerrar(null)">
 <section role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">Confirmación</h2>
 <form (ngSubmit)="dialog.cerrar(e.valor)"><p>{{e.mensaje}}</p>
 <input *ngIf="e.entrada" name="valor" [(ngModel)]="e.valor" aria-label="Valor" required autofocus />
 <div class="actions"><button type="button" (click)="dialog.cerrar(null)">Cancelar</button><button type="submit">Confirmar</button></div></form></section></div>`,
 styles:[`.overlay{position:fixed;inset:0;background:#0008;z-index:10000;display:grid;place-items:center;padding:20px}section{background:white;color:#292826;border-radius:20px;padding:28px;width:min(440px,100%);box-sizing:border-box}input{width:100%;box-sizing:border-box;padding:12px}.actions{display:flex;justify-content:flex-end;gap:12px;margin-top:24px}button{padding:10px 18px;border:0;border-radius:20px;cursor:pointer}button[type=submit]{background:#2B2A28;color:white}`]})
export class DialogComponent { readonly dialog=inject(DialogService); }
''')
for p in Path('frontend/src/app/features').rglob('*.component.ts'):
 s=p.read_text(encoding='utf-8')
 if not re.search(r'\b(confirm|prompt)\(',s): continue
 rel='../../shared' if p.parent.name=='ingresos' else '../../../shared'
 s=f"import {{ inject }} from '@angular/core';\nimport {{ DialogService }} from '{rel}/dialog.service';\n"+s
 s=s.replace('implements OnInit {','implements OnInit {\n  readonly dialog = inject(DialogService);')
 s=re.sub(r'(\w+)\(([^\n]*)\): void \{(\s+const \w+ = )(confirm|prompt)\(',r'async \1(\2): Promise<void> {\3await this.dialog.\4(',s)
 p.write_text(s,encoding='utf-8')
edit('frontend/src/app/app.component.ts',lambda s: "import { DialogComponent } from './shared/dialog.component';\n"+s.replace('imports: [','imports: [DialogComponent, '))
edit('frontend/src/app/app.component.html',lambda s:s+'\n<app-dialog></app-dialog>\n')

# All pages use the same date range filter; summaries derive from filtered records.
for path, records in [('gastos/gastos-page/gastos-page', [('gastos','Gasto')]),('ingresos/ingresos',[('ingresos','Ingreso')]),('gastos/ahorro-page/ahorro-page',[('ahorros','Ahorro')]),('gastos/resumen-page/resumen-page',[('gastos','Gasto'),('ingresos','Ingreso'),('ahorros','Ahorro')]),('gastos/reportes-page/reportes-page',[('gastos','Gasto'),('ingresos','Ingreso'),('ahorros','Ahorro')])]:
 p=Path(f'frontend/src/app/features/{path}.component.ts'); s=p.read_text(encoding='utf-8')
 rel='../../shared' if path=='ingresos/ingresos' else '../../../shared'
 s=f"import {{ TopFiltersComponent, RangoFechas }} from '{rel}/top-filters/top-filters.component';\nimport {{ enRango, resumir }} from '{rel}/registro.utils';\n"+s
 s=s.replace('imports: [','imports: [TopFiltersComponent, ')
 s=s.replace('implements OnInit {', "implements OnInit {\n  readonly rango = signal<RangoFechas>({desde:null,hasta:null,etiqueta:'Todo'});\n  onRango(r: RangoFechas): void { this.rango.set(r); } ")
 for name,typ in records:
  s=s.replace(f'readonly {name} = signal<{typ}[]>([]);',f'private readonly {name}Todos = signal<{typ}[]>([]);\n  readonly {name} = computed(() => this.{name}Todos().filter(r => enRango(r.fecha, this.rango())));')
  s=s.replace(f'this.{name}.set(',f'this.{name}Todos.set(')
 summary='resumenGastos' if 'reportes' in path else 'resumenCategorias'
 if f'readonly {summary} = signal' in s:
  s=s.replace(f'readonly {summary} = signal<ResumenCategoria[]>([]);',f'readonly {summary} = computed(() => resumir(this.{records[0][0]}()));')
  s=re.sub(r'    this\.\w+Service\.resumen\(\)\.subscribe\(\{.*?\}\);\n','',s,flags=re.S)
 p.write_text(s,encoding='utf-8')
 edit(str(p).replace('.ts','.html'),lambda s: re.sub(r'<div class="content-actions">.*?</div>','<app-top-filters (rangoChange)="onRango($event)"></app-top-filters>',s,count=1,flags=re.S))
edit('frontend/src/app/features/gastos/dashboard-overview/dashboard-overview.component.ts',lambda s: "import { resumir } from '../../../shared/registro.utils';\n"+s.replace('readonly resumenGastos = signal<ResumenCategoria[]>([]);','readonly resumenGastos = computed(() => resumir(this.gastos()));').replace('    this.gastoService.resumen().subscribe({ next: (r) => this.resumenGastos.set(r) });\n',''))
edit('frontend/src/app/shared/top-filters/top-filters.component.ts',lambda s: "import { hoyLocal } from '../registro.utils';\n"+s.replace('d.toISOString().slice(0, 10)','hoyLocal(d)').replace("readonly abierto = signal(false);","readonly abierto = signal(false);\n  readonly error = signal('');").replace('  aplicarPersonalizado(): void {',"  aplicarPersonalizado(): void {\n    this.error.set('');\n    if(this.desde() && this.hasta() && this.desde() > this.hasta()) { this.error.set('La fecha inicial no puede ser posterior a la final.'); return; }"))
edit('frontend/src/app/shared/top-filters/top-filters.component.html',lambda s:s.replace('<div class="custom-range">','<p role="alert" *ngIf="error()">{{error()}}</p><div class="custom-range">').replace('type="date" [ngModel]="desde()"','type="date" aria-label="Desde" [ngModel]="desde()"').replace('type="date" [ngModel]="hasta()"','type="date" aria-label="Hasta" [ngModel]="hasta()"'))

for p in Path('frontend/src/app/features').rglob('*.component.html'):
 edit(p,lambda s: s.replace('rx="3"','rx="8"').replace("+ ' 251'", "+ ' ' + (2 * 3.141592653589793 * 40)").replace("+ ' 176'", "+ ' ' + (2 * 3.141592653589793 * 28)"))
for p in Path('frontend/src/app/features').rglob('*.component.ts'):
 edit(p,lambda s:s.replace('const circunferencia = 251;', 'const circunferencia = 2 * Math.PI * 40;').replace('const circunferencia = 176;', 'const circunferencia = 2 * Math.PI * 28;'))
edit('frontend/src/styles.scss',lambda s:s+'''\n/* Shared action appearance */
.icon-btn-sm:not(.danger), .header-btn, .btn-secondary { background:var(--d-dark, #2B2A28) !important; color:#fff !important; }
a.btn-secondary-dark, a.btn-secondary {display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border-radius:999px;text-decoration:none;margin:8px 0;}
button:focus-visible, a:focus-visible {outline:3px solid #E8672A;outline-offset:3px;}
''')
