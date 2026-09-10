import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Etiqueta, EtiquetaInput } from './etiqueta.models';

@Injectable({ providedIn: 'root' })
export class EtiquetaService {
  private readonly baseUrl = `${environment.apiUrl}/etiquetas`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Etiqueta[]> {
    return this.http.get<Etiqueta[]>(this.baseUrl);
  }

  crear(data: EtiquetaInput): Observable<Etiqueta> {
    return this.http.post<Etiqueta>(this.baseUrl, data);
  }

  actualizar(id: string, data: EtiquetaInput): Observable<Etiqueta> {
    return this.http.put<Etiqueta>(`${this.baseUrl}/${id}`, data);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
