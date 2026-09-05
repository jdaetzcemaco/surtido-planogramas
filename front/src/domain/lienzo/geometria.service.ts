import type { GondolaLienzo, NivelLienzo } from './lienzo.types';

/** Separación por defecto que se asume por encima del nivel más alto de una góndola (cm). */
const HOLGURA_SUPERIOR_CM = 35;

/**
 * Alto físico disponible (cm) entre un nivel y el siguiente hacia arriba — el hueco real
 * donde debe caber el producto. Si el nivel es el más alto de la góndola, se asume una
 * holgura por defecto por encima (no hay nivel siguiente contra el cual medir).
 */
export function calcularGapCm(gondola: GondolaLienzo, nivel: NivelLienzo): number {
  const ordenados = [...gondola.niveles].sort((a, b) => a.orden - b.orden);
  const indice = ordenados.findIndex((n) => n.id === nivel.id);
  const siguiente = ordenados[indice + 1];
  return (siguiente ? siguiente.alturaDesdePisoCm : nivel.alturaDesdePisoCm + HOLGURA_SUPERIOR_CM) - nivel.alturaDesdePisoCm;
}
