import { Routes } from '@angular/router';

export const GASTOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./gastos-home.component').then((m) => m.GastosHomeComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./dashboard-overview/dashboard-overview.component').then(
            (m) => m.DashboardOverviewComponent
          ),
      },
      {
        path: 'ingresos',
        loadComponent: () =>
          import('../ingresos/ingresos.component').then((m) => m.IngresosComponent),
      },
      {
        path: 'etiquetas',
        loadComponent: () =>
          import('./etiquetas-page/etiquetas-page.component').then(
            (m) => m.EtiquetasPageComponent
          ),
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./categorias-page/categorias-page.component').then(
            (m) => m.CategoriasPageComponent
          ),
      },
      {
        path: 'resumen',
        loadComponent: () =>
          import('./resumen-page/resumen-page.component').then((m) => m.ResumenPageComponent),
      },
      {
        path: 'gastos',
        loadComponent: () =>
          import('./gastos-page/gastos-page.component').then((m) => m.GastosPageComponent),
      },
      {
        path: 'ahorro',
        loadComponent: () =>
          import('./ahorro-page/ahorro-page.component').then((m) => m.AhorroPageComponent),
      },
    ],
  },
];
