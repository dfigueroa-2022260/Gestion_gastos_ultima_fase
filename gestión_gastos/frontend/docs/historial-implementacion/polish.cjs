const fs=require('fs'),path=require('path');
const read=p=>fs.readFileSync(p,'utf8').replaceAll('\r\n','\n');
const write=(p,s)=>fs.writeFileSync(p,s);
const edit=(p,f)=>write(p,f(read(p)));
const files=(p,suffix)=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(p,e.name),suffix):e.name.endsWith(suffix)?[path.join(p,e.name)]:[]);
// Include dashboard styles once, scoped to the dashboard shell.
edit('frontend/src/styles.scss',s=>`@use 'app/features/gastos/styles/dashboard-shared' as dashboard;
`+s);
// Sass @use loads the stylesheet globally; scope selectors in the source itself.
edit('frontend/src/app/features/gastos/styles/_dashboard-shared.scss',s=>`app-gastos-home {\n${s}\n}\n`);
for(const p of files('frontend/src/app/features','.scss'))edit(p,s=>s.replace(/@import ['"][^'"]*dashboard-shared['"];\n?/g,''));
for(const p of files('frontend/src/app/features','.component.ts'))edit(p,s=>s.replaceAll('return circunferencia - (pct / 100) * circunferencia;','return -(pct / 100) * circunferencia;').replaceAll("new Date(raw.fecha.slice(0, 10) + 'T12:00:00').toISOString()","raw.fecha + 'T00:00:00.000Z'"));
for(const p of files('frontend/src/app/features','.component.html'))edit(p,s=>s.replaceAll('rx="4"','rx="10"').replace('<span>Revenue Analytics</span>','<span>Total del período</span>').replace('        <button type="button">EXTRAS</button>',''));
edit('frontend/src/app/features/gastos/categorias-page/categorias-page.component.html',s=>s.replace('<h1>CASH TRACK <span>categorias</span></h1>','<h1>CASH TRACK <span>categorias</span></h1>\n  <app-top-filters (rangoChange)="onRango($event)"></app-top-filters>'));
for(const p of ['frontend/src/app/features/gastos/dashboard-overview/dashboard-overview.component.html','frontend/src/app/features/gastos/reportes-page/reportes-page.component.html'])edit(p,s=>s.replace(/(<svg class="donut-chart"[^>]*>)/,'$1\n        <text *ngIf="resumenGastos().length === 1" x="50" y="53" text-anchor="middle" font-size="10" fill="currentColor">100%</text>'));
for(const p of ['frontend/src/app/features/gastos/gastos-page/gastos-page.component.html','frontend/src/app/features/ingresos/ingresos.component.html','frontend/src/app/features/gastos/ahorro-page/ahorro-page.component.html'])edit(p,s=>s.replace('<svg class="donut-chart" viewBox="0 0 100 100">','<svg class="donut-chart" viewBox="0 0 100 100">\n        <text *ngIf="resumenCategorias().length === 1" x="50" y="53" text-anchor="middle" font-size="10" fill="currentColor">100%</text>'));
edit('frontend/src/app/features/gastos/resumen-page/resumen-page.component.ts',s=>s.replace(/\/\*\*[\s\S]*?\*\//,'/** Resumen de movimientos, cuentas y planificación mensual del usuario. */').replace('enRango, resumir','enRango').replace('() => this.totalIngresos() - this.totalGastos() + this.totalAhorros()','() => this.totalIngresos() - this.totalGastos()'));
edit('frontend/src/app/features/gastos/dashboard-overview/dashboard-overview.component.ts',s=>s.replace('this.totalIngresos() - this.totalGastos() + this.totalAhorros()','this.totalIngresos() - this.totalGastos()'));
// Make selected calendar day visible and synchronize the range control.
edit('frontend/src/app/shared/top-filters/top-filters.component.ts',s=>s.replace('EventEmitter, Output','EventEmitter, Input, Output').replace('export class TopFiltersComponent {',`export class TopFiltersComponent {
  @Input() set rango(value: RangoFechas) {
    this.desde.set(value.desde ?? ''); this.hasta.set(value.hasta ?? ''); this.etiquetaActual.set(value.etiqueta);
  }`));
for(const p of files('frontend/src/app/features','.component.html'))edit(p,s=>s.replace('<app-top-filters (rangoChange)', '<app-top-filters [rango]="rango()" (rangoChange)'));
edit('frontend/src/styles.scss',s=>s+`\n.dia-celda[role=button]:not(.vacia) {cursor:pointer;}\n.dia-celda[role=button]:hover {outline:2px solid var(--d-accent);}\n`);
// Category errors are actionable, including duplicate names and referenced categories.
edit('backend/src/modules/categorias/categoria.schema.ts',s=>s.replace('z.string().min(2','z.string().trim().min(2'));
edit('backend/src/modules/etiquetas/etiqueta.schema.ts',s=>s.replace('z.string().min(2','z.string().trim().min(2'));
edit('backend/src/middlewares/error.middleware.ts',s=>`import { Prisma } from '@prisma/client';\n`+s.replace('  console.error(err);',`  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({error:'Ya existe un registro con ese nombre.'});
    if (err.code === 'P2003') return res.status(409).json({error:'No puedes eliminar una categoría que tiene movimientos asociados.'});
  }
  console.error(err);`));
for(const name of ['categorias','etiquetas'])edit(`frontend/src/app/features/gastos/${name}-page/${name}-page.component.ts`,s=>s.replace(/error: \(\) => this.error.set\('([^']+)'\)/g,"error: (err) => this.error.set(err?.error?.error ?? '$1')"));
// Use the same cent precision for goal amounts.
edit('backend/src/modules/metas/meta.schema.ts',s=>`import { montoRegistro } from '../../utils/registro.schema';\n`+s.replace('z.number().positive("El monto objetivo debe ser mayor a 0")','montoRegistro').replace('z.number().min(0).optional()','z.number().finite().min(0).max(99999999.99).optional()').replace('z.string().min(2','z.string().trim().min(2'));
edit('frontend/src/app/features/gastos/metas-page/metas-page.component.ts',s=>s.replace('Validators.min(1)','Validators.min(0.01)'));
edit('frontend/src/app/features/gastos/metas-page/metas-page.component.html',s=>s.replace('min="1"','min="0.01"'));
