/**
 * Constantes puramente visuales del Lienzo (conversión cm → px y mínimos de dibujo). Viven
 * separadas del dominio (`domain/lienzo/`) porque no son reglas de negocio — son solo la
 * escala con la que este canvas concreto dibuja cm en pantalla.
 */
export const PX_POR_CM = 3.4;
export const ALTURA_MIN_NIVEL_PX = 46;
export const ANCHO_MIN_POSICION_PX = 26;

/**
 * Ancho fijo (px) que ocupa el "marco" de una góndola alrededor de sus niveles — la regla
 * vertical, el espacio entre la regla y los niveles, y el padding del cuerpo. El ancho total
 * del frame de una góndola es siempre `anchoCm * PX_POR_CM + CHROME_GONDOLA_PX`; si una fila
 * de posiciones excede ese ancho, se desborda con scroll horizontal propio (ver
 * `GondolaFrameLienzo.css`) en vez de ensanchar el frame — así el layout del lienzo (que
 * reserva espacio entre góndolas según este mismo ancho) nunca queda desincronizado con lo que
 * realmente se dibuja en pantalla.
 */
export const CHROME_GONDOLA_PX = 60;
