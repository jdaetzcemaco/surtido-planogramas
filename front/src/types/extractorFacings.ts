/** Porcentaje del ancho/alto de la imagen (0 a 100 en ambos ejes) — (0,0) esquina superior
 * izquierda de la imagen, (100,100) esquina inferior derecha. `x`,`y` es la esquina superior
 * izquierda del recuadro; `ancho`,`alto` su tamaño, en ese mismo porcentaje. */
export interface RecuadroFacing {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface ResultadoExtraccionFacings {
  facings: RecuadroFacing[];
  advertencias: string[];
}

/** Punto de calibración — no viene del modelo: lo agrega siempre `extractorFacingsService` en las
 * 4 esquinas para poder confirmar a simple vista si el mapeo de coordenadas está bien alineado con
 * la imagen, independientemente de qué tan preciso ande el modelo detectando facings reales. */
export interface PuntoReferenciaFacing {
  x: number;
  y: number;
}

export interface ResultadoDeteccionFacings extends ResultadoExtraccionFacings {
  puntosReferencia: PuntoReferenciaFacing[];
}
