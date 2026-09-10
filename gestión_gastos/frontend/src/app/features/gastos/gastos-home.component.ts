import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/services/auth.service';

interface ItemSidebar {
  icono: string;
  label: string;
  ruta?: string;
  exact?: boolean;
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
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './gastos-home.component.html',
  styleUrl: './gastos-home.component.scss',
})
export class GastosHomeComponent {
  readonly itemsSidebar: ItemSidebar[] = [
    { icono: 'home', label: 'Home', ruta: '/gastos', exact: true },
    { icono: 'chart', label: 'Resumen', ruta: '/gastos/resumen' },
    { icono: 'card', label: 'Gastos', ruta: '/gastos/gastos' },
    { icono: 'money', label: 'Ingresos', ruta: '/gastos/ingresos' },
    { icono: 'grid', label: 'Categorias' },
    { icono: 'tag', label: 'Etiquetas' },
    { icono: 'pie', label: 'Reportes' },
    { icono: 'clipboard', label: 'Metas' },
  ];

  // Solo para los items SIN ruta real todavia (feedback visual al click).
  readonly activoManual = signal('');

  seleccionar(label: string): void {
    this.activoManual.set(label);
  }

  constructor(
    public readonly authService: AuthService,
    private readonly router: Router
  ) {}

  salir(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
