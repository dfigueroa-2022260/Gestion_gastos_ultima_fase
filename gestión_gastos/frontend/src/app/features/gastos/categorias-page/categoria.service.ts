import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Categoria, CategoriaInput } from './categoria.models';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private readonly baseUrl = `${environment.apiUrl}/categorias`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.baseUrl);
  }

  crear(data: CategoriaInput): Observable<Categoria> {
    return this.http.post<Categoria>(this.baseUrl, data);
  }

  actualizar(id: string, data: CategoriaInput): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.baseUrl}/${id}`, data);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
