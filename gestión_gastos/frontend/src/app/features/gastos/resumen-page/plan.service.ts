import { Injectable, inject } from '@angular/core';
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
