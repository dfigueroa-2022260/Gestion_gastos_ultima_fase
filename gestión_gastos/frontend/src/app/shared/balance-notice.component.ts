import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BalanceService } from './balance.service';

@Component({
  selector: 'app-balance-notice', standalone: true, imports: [CommonModule],
  template: `<p class="notice" role="alert" *ngIf="balance.error()">{{balance.error()}}</p>
    <ng-container *ngIf="balance.datos() as saldo">
      <p class="notice" role="alert" *ngIf="saldo.deficitDisponible || saldo.deficitAhorro">
        Hay registros anteriores que exceden tus fondos.
        <span *ngIf="saldo.deficitDisponible">Faltan Q{{saldo.deficitDisponible | number:'1.2-2'}} en el saldo disponible.</span>
        <span *ngIf="saldo.deficitAhorro">Los retiros superan los ahorros por Q{{saldo.deficitAhorro | number:'1.2-2'}}.</span>
        Corrige los movimientos o registra los fondos reales pendientes. No se permiten operaciones que aumenten ese faltante.
      </p>
    </ng-container>`,
  styles: [`.notice {padding:12px 16px;border:1px solid #c43d3d55;border-radius:10px;background:#c43d3d0d;color:#b43c35;font:13px/1.6 Inter,sans-serif;margin:0 0 18px;}`],
})
export class BalanceNoticeComponent { readonly balance = inject(BalanceService); }
