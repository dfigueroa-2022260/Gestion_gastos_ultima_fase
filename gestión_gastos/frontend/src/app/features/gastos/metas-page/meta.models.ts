export type PrioridadMeta = 'ALTA' | 'MEDIA' | 'BAJA';

export interface Meta {
  id: string;
  nombre: string;
  montoObjetivo: number;
  montoActual: number;
  fechaCumplimiento: string | null;
  prioridad: PrioridadMeta;
  automatizarAhorro: boolean;
  icono: string;
}

export interface MetaInput {
  nombre: string;
  montoObjetivo: number;
  montoActual?: number;
  fechaCumplimiento?: string;
  prioridad?: PrioridadMeta;
  automatizarAhorro?: boolean;
  icono?: string;
}
