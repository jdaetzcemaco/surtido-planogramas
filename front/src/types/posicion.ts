export const PERFILES_REDONDEO = ['MRP', 'ZSRE'] as const;
export type PerfilRedondeo = (typeof PERFILES_REDONDEO)[number];

export const MODOS_POSICION = ['PLANOGRAMA', 'CROSS', 'PENDIENTE'] as const;
export type ModoPosicion = (typeof MODOS_POSICION)[number];

export const DECISIONES_POSICION = ['ACTIVO', 'INACTIVO'] as const;
export type DecisionPosicion = (typeof DECISIONES_POSICION)[number];


export interface AlternativaVision {
  sku: string;
  name: string;
  confidence: number;
}

export interface DatosVision {
  detectedName: string;
  facings: number;
  confidence: number;
  moduleId: string;
  reason: string;
  alternatives: AlternativaVision[];
}

export interface Posicion {
  id: number;
  nivelId: number;
  sku: string | null;
  nombre_detectado: string | null;
  confidence: number;
  datos_vision: DatosVision | null;
  orden_horizontal: number;
  ancho_asignado_cm: number;
  facings_horizontal: number;
  cantidad_apilable: number;
  unidades_por_facing: number;
  capacidad_maxima: number | null;
  min_estetico: number | null;
  min_final: number | null;
  max_final: number | null;
  perfil_redondeo: PerfilRedondeo;
  modo: ModoPosicion;
  cross_externo: boolean;
  montar_en_display: boolean;
  desborda_gondola: boolean;
  nota_desborde: string | null;
  decision: DecisionPosicion;
  observaciones: string | null;
}

export interface PosicionAccesorioEmbebido {
  id: number;
  accesorio_id: number;
  codigo: string;
  nombre: string;
  tipo: string;
  nota_libre: string | null;
}

export interface PosicionDetalle extends Posicion {
  accesorios: PosicionAccesorioEmbebido[];
}

/** Datos livianos del producto (mirror local, sin llamar a CATI) — ver GET_niveles_posiciones.md. */
export interface ProductoResumenPosicion {
  nombre: string | null;
  imagen_url: string | null;
  ancho_cm: number | null;
}

/** Posición enriquecida con `producto`, tal como la devuelve `GET /niveles/{id}/posiciones`. */
export interface PosicionConProducto extends Posicion {
  producto: ProductoResumenPosicion | null;
}

export interface PosicionEditada extends Posicion {
  advertencia?: string;
}

export interface AsignarSkuInput {
  sku: string;
  subcategorias?: string[];
}

export interface PosicionCampos {
  ancho_asignado_cm: number;
  facings_horizontal: number;
  cantidad_apilable: number;
  unidades_por_facing: number;
  capacidad_maxima?: number | null;
  min_estetico?: number | null;
  min_final?: number | null;
  max_final?: number | null;
  perfil_redondeo?: PerfilRedondeo;
  modo?: ModoPosicion;
  decision?: DecisionPosicion;
}

export interface PosicionInput extends PosicionCampos {
  sku: string | null;
  nombre_detectado: string | null;
  confidence: number;
  datos_vision: DatosVision | null;
  orden_horizontal: number;
}

export type PosicionCambios = Partial<PosicionCampos>;

export interface PosicionCambiosCompletos extends PosicionCambios {
  cross_externo?: boolean;
  montar_en_display?: boolean;
  desborda_gondola?: boolean;
  nota_desborde?: string | null;
  observaciones?: string | null;
}

export interface Capacidad {
  ancho_disponible_cm: number;
  ancho_ocupado_cm: number;
  ancho_libre_cm: number;
}

export interface PosicionesDeNivel {
  posiciones: PosicionConProducto[];
  capacidad: Capacidad;
}

export interface PosicionMovida {
  id: number;
  nivel_id: number;
  orden_horizontal: number;
}

export interface PosicionAccesorio {
  id: number;
  posicionId: number;
  accesorio: {
    id: number;
    codigo: string;
    nombre: string;
    tipo: string;
    longitud_cm: number | null;
  };
  nota_libre: string | null;
  orden: number;
}

export interface PosicionAccesorioInput {
  accesorio_id: number;
  nota_libre?: string | null;
}

export interface PosicionPorSkuItem {
  id: number;
  gondolaNombre: string;
  nivelOrden: number;
  orden_horizontal: number;
}

export interface PosicionPorSku {
  sku: string;
  totalPosicionesEnVersion: number;
  skuSustitutoRecomendado: string | null;
  posiciones: PosicionPorSkuItem[];
}
