import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService } from './dialog.service';
@Component({selector:'app-dialog',standalone:true,imports:[CommonModule,FormsModule],
 template:`<div class="overlay" *ngIf="dialog.estado() as e" (keydown.escape)="dialog.cerrar(null)">
 <section role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">{{e.entrada ? "Editar valor" : "Confirmación"}}</h2>
 <form (ngSubmit)="dialog.cerrar(e.valor)"><p>{{e.mensaje}}</p>
 <input *ngIf="e.entrada" name="valor" [(ngModel)]="e.valor" aria-label="Valor" required autofocus />
 <div class="actions"><button type="button" (click)="dialog.cerrar(null)">Cancelar</button><button type="submit">Confirmar</button></div></form></section></div>`,
 styles:[`
:host { font-family: 'Inter', sans-serif; }
.overlay { position: fixed; inset: 0; background: rgba(43,42,40,.48); backdrop-filter: blur(3px); z-index: 10000; display: grid; place-items: center; padding: 20px; }
section { background: #fff; color: #2b2a28; border: 1px solid #e8dcc6; border-radius: 16px; padding: 26px; width: min(440px,100%); box-sizing: border-box; box-shadow: 0 20px 60px #2b2a2826; }
h2 { font-size: 20px; font-weight: 800; margin: 0 0 12px; }
p { font-size: 14px; line-height: 1.6; color: #77736b; margin: 0 0 18px; overflow-wrap: anywhere; }
input { width: 100%; box-sizing: border-box; padding: 12px 14px; border: 1px solid #e8dcc6; border-radius: 8px; background: #fbf7ee; color: #2b2a28; font: inherit; font-size: 14px; outline: none; }
input:focus { border-color: #e8672a; box-shadow: 0 0 0 3px #e8672a18; }
.actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; flex-wrap: wrap; }
button { padding: 11px 22px; border: 1px solid #e8dcc6; border-radius: 999px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 700; background: #fbf7ee; color: #2b2a28; }
button[type=submit] { background: #e8672a; color: #fff; border-color: #e8672a; }
button:hover { filter: brightness(.96); }
`]})
export class DialogComponent { readonly dialog=inject(DialogService); }
