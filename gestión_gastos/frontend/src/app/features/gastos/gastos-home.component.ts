import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';
import { PerfilPanelService } from '../../core/services/perfil-panel.service';
import { AhorroService } from './ahorro-page/ahorro.service';
import { GastoService } from './gastos-page/gasto.service';
import { Ingreso } from '../ingresos/models/ingreso.models';
import { IngresoService } from '../ingresos/services/ingreso.service';
import { Gasto } from './gastos-page/gasto.models';
import { Ahorro } from './ahorro-page/ahorro.models';

interface ItemSidebar {
  icono: string;
  label: string;
  ruta?: string;
  exact?: boolean;
}

interface ResultadoBusqueda {
  tipo: 'Gasto' | 'Ingreso' | 'Ahorro';
  descripcion: string;
  monto: number;
  fecha: string;
  ruta: string;
}

/**
 * Shell del dashboard: sidebar + topbar, con un <router-outlet> para el
 * contenido de cada pagina (Home, Ingresos, etc). Los items del sidebar
 * que ya tienen pagina real usan routerLink; los que todavia no existen
 * quedan como botones solo-visuales.
 */
@Component({
  selector: 'app-gastos-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './gastos-home.component.html',
  styleUrl: './gastos-home.component.scss',
})
export class GastosHomeComponent implements OnInit {
  readonly itemsSidebar: ItemSidebar[] = [
    { icono: 'home', label: 'Home', ruta: '/gastos', exact: true },
    { icono: 'chart', label: 'Resumen', ruta: '/gastos/resumen' },
    { icono: 'card', label: 'Gastos', ruta: '/gastos/gastos' },
    { icono: 'money', label: 'Ingresos', ruta: '/gastos/ingresos' },
    { icono: 'grid', label: 'Categorias', ruta: '/gastos/categorias' },
    { icono: 'tag', label: 'Etiquetas', ruta: '/gastos/etiquetas' },
    { icono: 'pie', label: 'Reportes', ruta: '/gastos/reportes' },
    { icono: 'clipboard', label: 'Metas', ruta: '/gastos/metas' },
  ];

  // Solo para los items SIN ruta real todavia (feedback visual al click).
  readonly activoManual = signal('');

  // --- Buscador ---------------------------------------------------------
  readonly busquedaAbierta = signal(false);
  readonly busquedaTexto = signal('');
  private readonly gastos = signal<Gasto[]>([]);
  private readonly ingresos = signal<Ingreso[]>([]);
  private readonly ahorros = signal<Ahorro[]>([]);

  readonly resultadosBusqueda = computed<ResultadoBusqueda[]>(() => {
    const q = this.busquedaTexto().trim().toLowerCase();
    if (!q) return [];

    const deGastos: ResultadoBusqueda[] = this.gastos()
      .filter(
        (g) =>
          (g.descripcion ?? '').toLowerCase().includes(q) ||
          g.categoria.nombre.toLowerCase().includes(q)
      )
      .map((g) => ({
        tipo: 'Gasto',
        descripcion: g.descripcion || g.categoria.nombre,
        monto: Number(g.monto),
        fecha: g.fecha,
        ruta: '/gastos/gastos',
      }));

    const deIngresos: ResultadoBusqueda[] = this.ingresos()
      .filter(
        (i) =>
          (i.descripcion ?? '').toLowerCase().includes(q) ||
          i.categoria.nombre.toLowerCase().includes(q)
      )
      .map((i) => ({
        tipo: 'Ingreso',
        descripcion: i.descripcion || i.categoria.nombre,
        monto: Number(i.monto),
        fecha: i.fecha,
        ruta: '/gastos/ingresos',
      }));

    const deAhorros: ResultadoBusqueda[] = this.ahorros()
      .filter(
        (a) =>
          (a.descripcion ?? '').toLowerCase().includes(q) ||
          a.categoria.nombre.toLowerCase().includes(q)
      )
      .map((a) => ({
        tipo: 'Ahorro',
        descripcion: a.descripcion || a.categoria.nombre,
        monto: Number(a.monto),
        fecha: a.fecha,
        ruta: '/gastos/ahorro',
      }));

    return [...deGastos, ...deIngresos, ...deAhorros]
      .sort((a, b) => (a.fecha > b.fecha ? -1 : 1))
      .slice(0, 8);
  });

  constructor(
    public readonly authService: AuthService,
    public readonly perfilPanel: PerfilPanelService,
    private readonly router: Router,
    private readonly gastoService: GastoService,
    private readonly ingresoService: IngresoService,
    private readonly ahorroService: AhorroService
  ) {}

  ngOnInit(): void {
    // Se cargan una vez al entrar al dashboard, para que el buscador
    // responda al instante sin pedir la lista en cada tecla.
    this.gastoService.listar().subscribe({ next: (g) => this.gastos.set(g) });
    this.ingresoService.listar().subscribe({ next: (i) => this.ingresos.set(i) });
    this.ahorroService.listar().subscribe({ next: (a) => this.ahorros.set(a) });
  }

  seleccionar(label: string): void {
    this.activoManual.set(label);
  }

  toggleBusqueda(): void {
    this.busquedaAbierta.update((v) => !v);
    if (!this.busquedaAbierta()) this.busquedaTexto.set('');
  }

  irAResultado(ruta: string): void {
    this.busquedaAbierta.set(false);
    this.busquedaTexto.set('');
    this.router.navigate([ruta]);
  }

  salir(): void {
    this.perfilPanel.cerrar();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
