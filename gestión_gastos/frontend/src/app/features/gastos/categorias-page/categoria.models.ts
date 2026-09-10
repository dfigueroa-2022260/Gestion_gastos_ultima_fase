export interface Categoria {
  id: string;
  nombre: string;
  color: string;
  icono: string;
  categoriaPadreId: string | null;
}

export interface CategoriaInput {
  nombre: string;
  color?: string;
  icono?: string;
  categoriaPadreId?: string | null;
}
