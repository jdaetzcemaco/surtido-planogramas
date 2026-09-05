/**
 * posicion.entity.js
 * Reglas de negocio puras del dominio Posicion.
 * Sin dependencias de Express, Knex ni ninguna infraestructura.
 */

/** Estados de PlanogramaVersion en los que se admite editar sus posiciones. */
const ESTADOS_VERSION_EDITABLE = Object.freeze(['borrador', 'en_desarrollo', 'piloto']);

/** Valores permitidos de perfil_redondeo: MRP (no se rompe empaque) | ZSRE (se puede romper). */
const PERFILES_REDONDEO = Object.freeze(['MRP', 'ZSRE']);

/** Valores permitidos de modo. */
const MODOS = Object.freeze(['PLANOGRAMA', 'CROSS', 'PENDIENTE']);

/** Confidence de una posición confirmada por el usuario (máximo, sin incertidumbre). */
const CONFIDENCE_CONFIRMADO = 100;

/** Valores permitidos de decision. */
const DECISIONES = Object.freeze(['ACTIVO', 'INACTIVO']);

function errorBadRequest(mensaje) {
  const err = new Error(mensaje);
  err.status = 400;
  err.code   = 'VALIDATION_ERROR';
  return err;
}

function errorUnprocessable(mensaje, details) {
  const err = new Error(mensaje);
  err.status = 422;
  err.code   = 'UNPROCESSABLE';
  if (details) err.details = details;
  return err;
}

/**
 * Valida que la versión padre esté en un estado que admite editar sus posiciones.
 * @param {string} estadoVersion
 */
function validarVersionEditable(estadoVersion) {
  if (!ESTADOS_VERSION_EDITABLE.includes(estadoVersion)) {
    throw errorUnprocessable('La versión no está en modo editable', { estadoActual: estadoVersion });
  }
}

/**
 * Valida la regla de CU-04-08: si se acepta un desborde, la nota de desborde es obligatoria.
 * Solo se valida cuando `desbordaGondola` viene explícitamente en el cambio.
 * @param {boolean|undefined} desbordaGondola
 * @param {string|null|undefined} notaDesborde
 */
function validarDesborde(desbordaGondola, notaDesborde) {
  if (desbordaGondola === true && (!notaDesborde || !notaDesborde.trim())) {
    throw errorBadRequest('desborda_gondola=true requiere una nota_desborde no vacía');
  }
}

/**
 * Valida min_final <= max_final cuando ambos se envían en la misma operación.
 * La violación de este invariante fuera de este caso se difiere a la validación
 * de publicación (ver PENDIENTES/ENDPOINTS.md — validar-publicacion).
 * @param {number|undefined} minFinal
 * @param {number|undefined} maxFinal
 */
function validarMinMax(minFinal, maxFinal) {
  if (minFinal !== undefined && minFinal !== null && maxFinal !== undefined && maxFinal !== null) {
    if (Number(minFinal) > Number(maxFinal)) {
      throw errorBadRequest('min_final no puede ser mayor a max_final');
    }
  }
}

/**
 * Calcula la advertencia (no bloqueante) de desborde de ancho en el nivel al agregar
 * una posición nueva — ver POST_posiciones_agregar.md.
 * @param {{ anchoOcupado: number, anchoNuevo: number, anchoDisponible: number }} datos
 * @returns {string|null}
 */
function calcularAdvertenciaEspacio({ anchoOcupado, anchoNuevo, anchoDisponible }) {
  const total = Number(anchoOcupado) + Number(anchoNuevo);
  if (total > Number(anchoDisponible)) {
    return `El nivel supera su ancho disponible. Ancho ocupado: ${total} cm / ${anchoDisponible} cm disponibles.`;
  }
  return null;
}

/**
 * Recalcula el ancho asignado a partir de los facings y el ancho físico del producto
 * (facings × ancho_cm) — mismo criterio que el front (`utils/posicionCalculos.ts`,
 * usado en "cambiar facings"). Si no hay ancho de producto conocido, mantiene el ancho
 * actual sin recalcular — evita que asignar un SKU deje la posición dibujada más angosta
 * (o más ancha) que el producto real.
 * @param {number} facings
 * @param {number|null|undefined} anchoProductoCm
 * @param {number} anchoActualCm
 * @returns {number}
 */
function calcularAnchoAsignado(facings, anchoProductoCm, anchoActualCm) {
  if (!facings || !anchoProductoCm) return anchoActualCm;
  return facings * anchoProductoCm;
}

module.exports = {
  ESTADOS_VERSION_EDITABLE,
  PERFILES_REDONDEO,
  MODOS,
  CONFIDENCE_CONFIRMADO,
  DECISIONES,
  validarVersionEditable,
  validarDesborde,
  validarMinMax,
  calcularAdvertenciaEspacio,
  calcularAnchoAsignado,
};
