const fs=require('fs'), path=require('path');
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s)};
const edit=(p,fn)=>write(p,fn(read(p)));
const files=(p,suffix)=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(p,e.name),suffix):e.name.endsWith(suffix)?[path.join(p,e.name)]:[]);
// Materialize the shared source files prepared in the implementation script.
for(const m of read('implement.py').matchAll(/write\('([^']+)','''([\s\S]*?)'''\)/g)) write(m[1],m[2].replaceAll('\\\\','\\'));
for(const mod of ['gastos/gasto','ingresos/ingreso','ahorros/ahorro']) edit(`backend/src/modules/${mod}.schema.ts`,s=>s.replace('import { z } from "zod";', 'import { z } from "zod";\nimport { montoRegistro, descripcionRegistro, fechaRegistro } from "../../utils/registro.schema";').replace('z.number().positive("El monto debe ser mayor a 0")','montoRegistro').replace('z.string().optional()','descripcionRegistro').replace('z.coerce.date().optional()','fechaRegistro.optional()'));
for(const p of files('frontend/src/app/features','.component.ts')) edit(p,s=>s.replaceAll('${f.getMonth()}',"${String(f.getMonth()).padStart(2, '0')}").replace(/new Date\((\w+)\.fecha\)/g,"new Date($1.fecha.slice(0, 10) + 'T12:00:00')").replaceAll('new Date(fechaStr)',"new Date(fechaStr.slice(0, 10) + 'T12:00:00')"));
for(const name of ['gastos/gastos-page/gastos-page','ingresos/ingresos','gastos/ahorro-page/ahorro-page']) {
 const p=`frontend/src/app/features/${name}.component.ts`, rel=name==='ingresos/ingresos'?'../../shared':'../../../shared';
 edit(p,s=>`import { hoyLocal, fechaPasada, descripcionObligatoria } from '${rel}/registro.utils';\n`+s.replace("descripcion: [''],","descripcion: ['', [descripcionObligatoria]],").replace('fecha: [this.hoyISO()],','fecha: [this.hoyISO(), [fechaPasada]],').replace('private hoyISO()', 'hoyISO()').replace('new Date().toISOString().slice(0, 10)','hoyLocal()').replace('this.form.markAllAsTouched();\n      return;',"this.form.markAllAsTouched();\n      this.errorForm.set('Revisa los campos: el monto debe ser mayor a 0, la descripción es obligatoria y la fecha no puede ser futura.');\n      return;").replace('raw.descripcion || undefined','raw.descripcion.trim()'));
 edit(p.replace('.ts','.html'),s=>s.replace('placeholder="Opcional"','placeholder="Descripción obligatoria" required').replace('type="date" formControlName="fecha"','type="date" [max]="hoyISO()" formControlName="fecha"').replaceAll("date: 'dd/MM/yyyy'","date: 'dd/MM/yyyy':'UTC'"));
}
for(const p of files('frontend/src/app/features','.component.ts')) {
 let s=read(p).replaceAll('\r\n','\n'); if(!/\b(confirm|prompt)\(/.test(s))continue;
 const rel=path.basename(path.dirname(p))==='ingresos'?'../../shared':'../../../shared';
 s=`import { inject } from '@angular/core';\nimport { DialogService } from '${rel}/dialog.service';\n`+s;
 s=s.replace('implements OnInit {','implements OnInit {\n  readonly dialog = inject(DialogService);');
 s=s.replace(/(\w+)\(([^\n]*)\): void \{(\s+const \w+ = )(confirm|prompt)\(/g,'async $1($2): Promise<void> {$3await this.dialog.$4(');write(p,s);
}
edit('frontend/src/app/app.component.ts',s=>"import { DialogComponent } from './shared/dialog.component';\n"+s.replace('imports: [','imports: [DialogComponent, '));
edit('frontend/src/app/app.component.html',s=>s+'\n<app-dialog></app-dialog>\n');
for(const [name,records] of [['gastos/gastos-page/gastos-page',[['gastos','Gasto']]],['ingresos/ingresos',[['ingresos','Ingreso']]],['gastos/ahorro-page/ahorro-page',[['ahorros','Ahorro']]],['gastos/resumen-page/resumen-page',[['gastos','Gasto'],['ingresos','Ingreso'],['ahorros','Ahorro']]],['gastos/reportes-page/reportes-page',[['gastos','Gasto'],['ingresos','Ingreso'],['ahorros','Ahorro']]]]) {
 const p=`frontend/src/app/features/${name}.component.ts`,rel=name==='ingresos/ingresos'?'../../shared':'../../../shared'; let s=read(p).replaceAll('\r\n','\n');
 s=`import { TopFiltersComponent, RangoFechas } from '${rel}/top-filters/top-filters.component';\nimport { enRango, resumir } from '${rel}/registro.utils';\n`+s;
 s=s.replace('imports: [','imports: [TopFiltersComponent, ').replace('implements OnInit {',"implements OnInit {\n  readonly rango = signal<RangoFechas>({desde:null,hasta:null,etiqueta:'Todo'});\n  onRango(r: RangoFechas): void { this.rango.set(r); }");
 for(const [n,t] of records)s=s.replace(`readonly ${n} = signal<${t}[]>([]);`,`private readonly ${n}Todos = signal<${t}[]>([]);\n  readonly ${n} = computed(() => this.${n}Todos().filter(r => enRango(r.fecha, this.rango())));`).replaceAll(`this.${n}.set(`,`this.${n}Todos.set(`);
 const summary=name.includes('reportes')?'resumenGastos':'resumenCategorias';
 if(s.includes(`readonly ${summary} = signal`))s=s.replace(`readonly ${summary} = signal<ResumenCategoria[]>([]);`,`readonly ${summary} = computed(() => resumir(this.${records[0][0]}()));`).replace(/    this\.\w+Service\.resumen\(\)\.subscribe\(\{[\s\S]*?\}\);\n/g,'');
 write(p,s);edit(p.replace('.ts','.html'),s=>s.replace(/<div class="content-actions">[\s\S]*?<\/div>/,'<app-top-filters (rangoChange)="onRango($event)"></app-top-filters>'));
}
edit('frontend/src/app/features/gastos/dashboard-overview/dashboard-overview.component.ts',s=>"import { resumir } from '../../../shared/registro.utils';\n"+s.replace('readonly resumenGastos = signal<ResumenCategoria[]>([]);','readonly resumenGastos = computed(() => resumir(this.gastos()));').replace(/    this.gastoService.resumen\(\).subscribe\(\{ next: \(r\) => this.resumenGastos.set\(r\) \}\);\r?\n/,''));
edit('frontend/src/app/shared/top-filters/top-filters.component.ts',s=>"import { hoyLocal } from '../registro.utils';\n"+s.replace('d.toISOString().slice(0, 10)','hoyLocal(d)').replace('readonly abierto = signal(false);',"readonly abierto = signal(false);\n  readonly error = signal('');").replace('  aplicarPersonalizado(): void {',"  aplicarPersonalizado(): void {\n    this.error.set('');\n    if(this.desde() && this.hasta() && this.desde() > this.hasta()) { this.error.set('La fecha inicial no puede ser posterior a la final.'); return; }"));
edit('frontend/src/app/shared/top-filters/top-filters.component.html',s=>s.replace('<div class="custom-range">','<p role="alert" *ngIf="error()">{{error()}}</p><div class="custom-range">').replace('type="date" [ngModel]="desde()"','type="date" aria-label="Desde" [ngModel]="desde()"').replace('type="date" [ngModel]="hasta()"','type="date" aria-label="Hasta" [ngModel]="hasta()"'));
for(const p of files('frontend/src/app/features','.component.html'))edit(p,s=>s.replaceAll('rx="3"','rx="8"').replaceAll("+ ' 251'","+ ' ' + (2 * 3.141592653589793 * 40)").replaceAll("+ ' 176'","+ ' ' + (2 * 3.141592653589793 * 28)"));
for(const p of files('frontend/src/app/features','.component.ts'))edit(p,s=>s.replaceAll('const circunferencia = 251;','const circunferencia = 2 * Math.PI * 40;').replaceAll('const circunferencia = 176;','const circunferencia = 2 * Math.PI * 28;'));
edit('frontend/src/styles.scss',s=>s+`\n.icon-btn-sm:not(.danger), .header-btn, .btn-secondary {background:var(--d-dark,#2B2A28) !important;color:#fff !important;}
a.btn-secondary-dark,a.btn-secondary {display:inline-flex;align-items:center;justify-content:center;padding:10px 18px;border-radius:999px;text-decoration:none;margin:8px 0;}
button:focus-visible,a:focus-visible {outline:3px solid #E8672A;outline-offset:3px;}
`);
