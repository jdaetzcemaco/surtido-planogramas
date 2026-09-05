import type { NivelLienzo, CapacidadNivel } from './lienzo.types';

/** Espacio que restan los laterales/parantes de la góndola al ancho útil de cada nivel (cm). */
const MARGEN_ESTRUCTURAL_CM = 6;

/** Suma el ancho de las posiciones activas de un nivel — igual que `nivelRepo.anchoOcupadoCm` en el backend. */
export function calcularAnchoOcupadoCm(nivel: NivelLienzo): number {
  return nivel.posiciones.reduce((total, posicion) => total + (posicion.decision === 'ACTIVO' ? posicion.anchoCm : 0), 0);
}

/**
 * Capacidad de un nivel (ocupado/disponible/libre), mismo shape que la `Capacidad` que
 * devuelve `GET /niveles/{id}/posiciones` en el backend real — ver `listarPosiciones` en
 * `posicion.usecases.js`.
 */
export function calcularCapacidadNivel(nivel: NivelLienzo, anchoGondolaCm: number): CapacidadNivel {
  const disponibleCm = anchoGondolaCm - MARGEN_ESTRUCTURAL_CM;
  const ocupadoCm = calcularAnchoOcupadoCm(nivel);
  return {
    ocupadoCm,
    disponibleCm,
    libreCm: disponibleCm - ocupadoCm,
    sobreOcupado: ocupadoCm > disponibleCm,
  };
}
