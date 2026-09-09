export interface Categoria {
  id: string;
  nombre: string;
  color: string;
}

export interface Gasto {
  id: string;
  monto: number;
  descripcion: string | null;
  fecha: string;
  categoriaId: string;
  categoria: Categoria;
}

export interface GastoInput {
  monto: number;
  descripcion?: string;
  fecha?: string;
  categoriaId: string;
}

export interface ResumenCategoria {
  categoriaId: string;
  nombre: string;
  color: string;
  total: number;
}
