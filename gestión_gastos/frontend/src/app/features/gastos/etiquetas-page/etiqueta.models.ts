export interface Etiqueta {
  id: string;
  nombre: string;
  color: string;
  icono: string;
  etiquetaPadreId: string | null;
}

export interface EtiquetaInput {
  nombre: string;
  color?: string;
  icono?: string;
  etiquetaPadreId?: string | null;
}
