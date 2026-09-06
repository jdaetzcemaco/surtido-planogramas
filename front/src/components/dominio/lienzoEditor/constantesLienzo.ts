/**
 * Constantes puramente visuales del Lienzo (conversión cm → px y mínimos de dibujo). Viven
 * separadas del dominio (`domain/lienzo/`) porque no son reglas de negocio — son solo la
 * escala con la que este canvas concreto dibuja cm en pantalla.
 */
export const PX_POR_CM = 3.4;
export const ALTURA_MIN_NIVEL_PX = 46;
export const ANCHO_MIN_POSICION_PX = 26;

/**
 * Ancho fijo (px) que ocupa el "marco" de una góndola alrededor de sus niveles: el borde del
 * frame (2px) + el padding del cuerpo (28px) + la regla vertical y su gap (30 + 2px) + el borde
 * de `.nivel-fila-lienzo` y el padding de `.nivel-fila-lienzo__pista` (2 + 16px) = 80px en total
 * (ver `GondolaFrameLienzo.css` / `NivelFilaLienzo.css`).
 *
 * Este número es una aproximación del chrome real, no necesita ser exacto: el indicador de
 * "espacio libre" de cada nivel (`.nivel-fila-lienzo__espacio-libre`) crece con flexbox para
 * ocupar lo que sobre en vez de usar un ancho en px calculado a mano, así que absorbe cualquier
 * diferencia — siempre que haya indicador. Cuando un nivel está exactamente lleno (sin espacio
 * libre que mostrar), no hay nada que absorba el `gap` entre posiciones — para eso está
 * `GAP_PISTA_PX` / `calcularAnchoFramePx` más abajo. No usar este valor solo — usar siempre
 * `calcularAnchoFramePx` para el ancho del frame.
 */
export const CHROME_GONDOLA_PX = 80;

/**
 * Separación (px) que `.nivel-fila-lienzo__pista` deja con `gap` entre sus hijos — debe
 * coincidir con el `gap` de esa clase en `NivelFilaLienzo.css`. Un nivel sin espacio libre que
 * mostrar (exactamente lleno) no tiene el indicador flexible de `.nivel-fila-lienzo__espacio-libre`
 * para absorber ese `gap`, así que sus posiciones solas ya necesitan ese espacio de más — ver
 * `calcularAnchoFramePx`.
 */
export const GAP_PISTA_PX = 5;

/**
 * Ancho (px) del frame de una góndola: `anchoCm * PX_POR_CM + CHROME_GONDOLA_PX`, más un margen
 * extra por los `gap` de `.nivel-fila-lienzo__pista` que ningún indicador de "espacio libre"
 * alcanza a absorber cuando un nivel está exactamente lleno. Ese margen se calcula con el nivel
 * de MÁS posiciones de la góndola (todos los niveles comparten el mismo ancho de pista, así que
 * alcanza con cubrir el peor caso) — sin él, ese nivel exactamente lleno igual mostraba scroll
 * horizontal por los `gap` puramente visuales entre sus posiciones, no por estar realmente
 * sobre-ocupado.
 */
export function calcularAnchoFramePx(anchoCm: number, niveles: { posiciones: unknown[] }[]): number {
  const maxPosicionesPorNivel = niveles.reduce((max, n) => Math.max(max, n.posiciones.length), 0);
  const bufferGapPx = GAP_PISTA_PX * Math.max(0, maxPosicionesPorNivel - 1);
  return anchoCm * PX_POR_CM + CHROME_GONDOLA_PX + bufferGapPx;
}
