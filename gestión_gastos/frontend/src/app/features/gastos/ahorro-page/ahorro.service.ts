import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Ahorro, AhorroInput, Categoria, ResumenCategoria } from './ahorro.models';

@Injectable({ providedIn: 'root' })
export class AhorroService {
  private readonly baseUrl = `${environment.apiUrl}/ahorros`;
  private readonly categoriasUrl = `${environment.apiUrl}/categorias`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Ahorro[]> {
    return this.http.get<Ahorro[]>(this.baseUrl);
  }

  resumen(): Observable<ResumenCategoria[]> {
    return this.http.get<ResumenCategoria[]>(`${this.baseUrl}/resumen`);
  }

  crear(data: AhorroInput): Observable<Ahorro> {
    return this.http.post<Ahorro>(this.baseUrl, data);
  }

  actualizar(id: string, data: AhorroInput): Observable<Ahorro> {
    return this.http.put<Ahorro>(`${this.baseUrl}/${id}`, data);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  listarCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.categoriasUrl);
  }

  crearCategoria(nombre: string, color: string): Observable<Categoria> {
    return this.http.post<Categoria>(this.categoriasUrl, { nombre, color });
  }
}
