/**
 * posicion.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * La implementación concreta vive en:
 *   src/infrastructure/repositories/posicion.repository.js
 */

module.exports = {
  /**
   * Lista las posiciones de un nivel ordenadas por `orden_horizontal` ascendente.
   * @param {number} nivelId
   * @returns {Promise<object[]>}
   */
  listarPorNivel: async (_nivelId) => { throw new Error('No implementado'); },

  /**
   * Retorna el detalle de una posición (sin accesorios).
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  buscarPorId: async (_id) => { throw new Error('No implementado'); },

  /**
   * Retorna el detalle de una posición junto con sus accesorios de montaje.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  buscarPorIdConAccesorios: async (_id) => { throw new Error('No implementado'); },

  /**
   * Crea una posición nueva.
   * @param {object} datos
   * @returns {Promise<number>} id de la posición creada
   */
  crear: async (_datos) => { throw new Error('No implementado'); },

  /**
   * Aplica un partial update de una posición.
   * @param {number} id
   * @param {object} cambios
   * @returns {Promise<void>}
   */
  actualizar: async (_id, _cambios) => { throw new Error('No implementado'); },

  /**
   * Mueve una posición a otro nivel/orden, reajustando el `orden_horizontal` de las
   * posiciones afectadas en el nivel origen y destino, en una sola transacción.
   * @param {{ posicionId:number, nivelOrigenId:number, ordenOrigen:number, nivelDestinoId:number, ordenDestino:number }} comando
   * @returns {Promise<void>}
   */
  mover: async (_comando) => { throw new Error('No implementado'); },

  /**
   * Clona una posición (con sus accesorios) en el nivel/orden destino.
   * @param {number} posicionOriginalId
   * @param {number} nivelDestinoId
   * @param {number} ordenDestino
   * @returns {Promise<number>} id de la copia creada
   */
  copiar: async (_posicionOriginalId, _nivelDestinoId, _ordenDestino) => { throw new Error('No implementado'); },

  /**
   * Elimina una posición (y sus accesorios) y decrementa el `orden_horizontal`
   * de las posiciones del mismo nivel que quedaban después de la eliminada.
   * @param {number} id
   * @returns {Promise<void>}
   */
  eliminarYReajustar: async (_id) => { throw new Error('No implementado'); },

  /**
   * Lista los accesorios de montaje de una posición, ordenados por `orden`.
   * @param {number} posicionId
   * @returns {Promise<object[]>}
   */
  listarAccesorios: async (_posicionId) => { throw new Error('No implementado'); },

  /**
   * Verifica si un accesorio con ese id existe en la tabla Accesorio.
   * @param {number} accesorioId
   * @returns {Promise<boolean>}
   */
  accesorioExiste: async (_accesorioId) => { throw new Error('No implementado'); },

  /**
   * Agrega un accesorio de montaje a la posición; el `orden` se asigna como MAX(orden)+1.
   * @param {number} posicionId
   * @param {{ accesorio_id:number, nota_libre?:string }} datos
   * @returns {Promise<number>} id del registro PosicionAccesorio creado
   */
  agregarAccesorio: async (_posicionId, _datos) => { throw new Error('No implementado'); },

  /**
   * Busca un registro PosicionAccesorio por su id.
   * @param {number} posicionAccesorioId
   * @returns {Promise<object|null>}
   */
  buscarAccesorioPorId: async (_posicionAccesorioId) => { throw new Error('No implementado'); },

  /**
   * Elimina un registro PosicionAccesorio.
   * @param {number} posicionAccesorioId
   * @returns {Promise<void>}
   */
  eliminarAccesorio: async (_posicionAccesorioId) => { throw new Error('No implementado'); },

  /**
   * Busca las posiciones de un SKU dentro de una versión, con contexto de ubicación.
   * @param {string} sku
   * @param {number} versionId
   * @returns {Promise<{ totalPosicionesEnVersion:number, skuSustitutoRecomendado:string|null, posiciones:object[] }>}
   */
  buscarPorSkuEnVersion: async (_sku, _versionId) => { throw new Error('No implementado'); },

  /**
   * Actualiza la asignación de SKU de una posición pendiente (sku, modo, confidence, nombre
   * detectado y ancho asignado).
   * @param {number} id
   * @param {{ sku:string, modo:string, confidence:number, nombre_detectado:string|null, ancho_asignado_cm:number }} datos
   * @returns {Promise<void>}
   */
  actualizarAsignacionSku: async (_id, _datos) => { throw new Error('No implementado'); },
};
