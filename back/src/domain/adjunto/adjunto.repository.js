/**
 * adjunto.repository.js  (dominio)
 * Contrato del repositorio — define los métodos que cualquier implementación
 * concreta debe proveer. No contiene lógica; es documentación ejecutable.
 *
 * La implementación concreta vive en:
 *   src/infrastructure/repositories/adjunto.repository.js
 */

module.exports = {
  /**
   * Lista los adjuntos de una versión, más recientes primero.
   * @param {number} versionId
   * @returns {Promise<object[]>}
   */
  listarPorVersion: async (_versionId) => { throw new Error('No implementado'); },

  /**
   * Retorna un adjunto por id.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  buscarPorId: async (_id) => { throw new Error('No implementado'); },

  /**
   * Crea un adjunto nuevo.
   * @param {{ planograma_version_id, nombre_original, tipo_mime, tamano_bytes, blob_container, blob_path, blob_url, subido_por }} adjunto
   * @returns {Promise<number>} id del adjunto creado
   */
  crear: async (_adjunto) => { throw new Error('No implementado'); },

  /**
   * Actualiza los campos de archivo de un adjunto existente (reemplazo).
   * @param {number} id
   * @param {{ nombre_original, tipo_mime, tamano_bytes, blob_container, blob_path, blob_url, subido_por }} campos
   * @returns {Promise<void>}
   */
  actualizarArchivo: async (_id, _campos) => { throw new Error('No implementado'); },

  /**
   * Elimina un adjunto.
   * @param {number} id
   * @returns {Promise<void>}
   */
  eliminar: async (_id) => { throw new Error('No implementado'); },
};
