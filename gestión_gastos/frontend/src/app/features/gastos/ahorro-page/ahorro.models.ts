export type TipoAhorro = 'DEPOSITO' | 'RETIRO';

export interface Categoria {
  id: string;
  nombre: string;
  color: string;
}

export interface Ahorro {
  id: string;
  monto: number;
  descripcion: string | null;
  fecha: string;
  tipo: TipoAhorro;
  categoriaId: string;
  categoria: Categoria;
}

export interface AhorroInput {
  monto: number;
  descripcion?: string;
  fecha?: string;
  tipo?: TipoAhorro;
  categoriaId: string;
}

export interface ResumenCategoria {
  categoriaId: string;
  nombre: string;
  color: string;
  total: number;
}
