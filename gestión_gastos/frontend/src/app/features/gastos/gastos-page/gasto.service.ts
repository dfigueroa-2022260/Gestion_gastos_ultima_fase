import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Categoria, Gasto, GastoInput, ResumenCategoria } from './gasto.models';

@Injectable({ providedIn: 'root' })
export class GastoService {
  private readonly baseUrl = `${environment.apiUrl}/gastos`;
  private readonly categoriasUrl = `${environment.apiUrl}/categorias`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Gasto[]> {
    return this.http.get<Gasto[]>(this.baseUrl);
  }

  resumen(): Observable<ResumenCategoria[]> {
    return this.http.get<ResumenCategoria[]>(`${this.baseUrl}/resumen`);
  }

  crear(data: GastoInput): Observable<Gasto> {
    return this.http.post<Gasto>(this.baseUrl, data);
  }

  actualizar(id: string, data: GastoInput): Observable<Gasto> {
    return this.http.put<Gasto>(`${this.baseUrl}/${id}`, data);
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
