import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Meta, MetaInput } from './meta.models';

@Injectable({ providedIn: 'root' })
export class MetaService {
  private readonly baseUrl = `${environment.apiUrl}/metas`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Meta[]> {
    return this.http.get<Meta[]>(this.baseUrl);
  }

  crear(data: MetaInput): Observable<Meta> {
    return this.http.post<Meta>(this.baseUrl, data);
  }

  actualizar(id: string, data: Partial<MetaInput>): Observable<Meta> {
    return this.http.put<Meta>(`${this.baseUrl}/${id}`, data);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
