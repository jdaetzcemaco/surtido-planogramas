/** Coordenadas normalizadas de 0 a 1000 en ambos ejes — (0,0) esquina superior izquierda de la
 * imagen, (1000,1000) esquina inferior derecha. `x`,`y` es la esquina superior izquierda del
 * recuadro; `ancho`,`alto` su tamaño, en esa misma escala. */
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
