/**
 * adjunto.usecases.js
 * Casos de uso del dominio Adjunto.
 * Reciben el repositorio de Adjunto, el de Version y el cliente de Storage por inyección de
 * dependencia — sin imports de infraestructura. El binario vive en Azure Blob Storage
 * (contenedor privado); la BD solo guarda la referencia. La descarga real pasa siempre por el
 * backend — nunca se expone blob_url como link directo al frontend.
 */

const { validarVersionEditable, validarArchivo, generarBlobPath } = require('./adjunto.entity');

// ─── Helpers privados ────────────────────────────────────────────────────────

function errorNotFound(mensaje) {
  const err = new Error(mensaje);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

async function buscarVersionOFallar(versionRepo, versionId) {
  const version = await versionRepo.buscarPorId(versionId);
  if (!version) throw errorNotFound(`Versión ${versionId} no encontrada`);
  return version;
}

async function buscarAdjuntoOFallar(adjuntoRepo, id) {
  const adjunto = await adjuntoRepo.buscarPorId(id);
  if (!adjunto) throw errorNotFound(`Adjunto ${id} no encontrado`);
  return adjunto;
}

// ─── Casos de uso ────────────────────────────────────────────────────────────

/**
 * Lista los adjuntos de una versión, más recientes primero.
 * @param {object} adjuntoRepo
 * @param {object} versionRepo
 * @param {number} versionId
 * @returns {Promise<object[]>}
 */
async function listarAdjuntos(adjuntoRepo, versionRepo, versionId) {
  await buscarVersionOFallar(versionRepo, versionId);
  return adjuntoRepo.listarPorVersion(versionId);
}

/**
 * Sube un adjunto nuevo y lo asocia a la versión.
 * @param {object} adjuntoRepo
 * @param {object} versionRepo
 * @param {object} blobStorage
 * @param {number} versionId
 * @param {{ nombre_original, tipo_mime, archivo_base64 }} datos
 * @param {string} [userId]
 * @returns {Promise<object>}
 */
async function agregarAdjunto(adjuntoRepo, versionRepo, blobStorage, versionId, datos, userId) {
  const version = await buscarVersionOFallar(versionRepo, versionId);
  validarVersionEditable(version.estado);

  const buffer = Buffer.from(datos.archivo_base64, 'base64');
  validarArchivo({ tipoMime: datos.tipo_mime, tamanoBytes: buffer.length });

  const blobPath = generarBlobPath(versionId, datos.nombre_original);
  const { url }  = await blobStorage.subir({
    container: blobStorage.container, blobPath, buffer, contentType: datos.tipo_mime,
  });

  const id = await adjuntoRepo.crear({
    planograma_version_id: versionId,
    nombre_original:       datos.nombre_original,
    tipo_mime:              datos.tipo_mime,
    tamano_bytes:           buffer.length,
    blob_container:         blobStorage.container,
    blob_path:              blobPath,
    blob_url:               url,
    subido_por:             userId ?? 'sistema',
  });

  return adjuntoRepo.buscarPorId(id);
}

/**
 * Reemplaza el archivo de un adjunto existente, conservando su id: sube el archivo nuevo,
 * actualiza la fila y recién después borra el blob viejo (para no perder el archivo si la
 * escritura en BD fallara).
 * @param {object} adjuntoRepo
 * @param {object} versionRepo
 * @param {object} blobStorage
 * @param {number} id
 * @param {{ nombre_original, tipo_mime, archivo_base64 }} datos
 * @param {string} [userId]
 * @returns {Promise<object>}
 */
async function reemplazarAdjunto(adjuntoRepo, versionRepo, blobStorage, id, datos, userId) {
  const adjunto = await buscarAdjuntoOFallar(adjuntoRepo, id);
  const version = await buscarVersionOFallar(versionRepo, adjunto.versionId);
  validarVersionEditable(version.estado);

  const buffer = Buffer.from(datos.archivo_base64, 'base64');
  validarArchivo({ tipoMime: datos.tipo_mime, tamanoBytes: buffer.length });

  const blobPathNuevo = generarBlobPath(adjunto.versionId, datos.nombre_original);
  const { url } = await blobStorage.subir({
    container: blobStorage.container, blobPath: blobPathNuevo, buffer, contentType: datos.tipo_mime,
  });

  await adjuntoRepo.actualizarArchivo(id, {
    nombre_original: datos.nombre_original,
    tipo_mime:       datos.tipo_mime,
    tamano_bytes:    buffer.length,
    blob_container:  blobStorage.container,
    blob_path:       blobPathNuevo,
    blob_url:        url,
    subido_por:      userId ?? 'sistema',
  });

  await blobStorage.eliminar({ container: adjunto.blobContainer, blobPath: adjunto.blobPath });

  return adjuntoRepo.buscarPorId(id);
}

/**
 * Elimina un adjunto: borra la fila y, después, el blob físico en Azure.
 * @param {object} adjuntoRepo
 * @param {object} versionRepo
 * @param {object} blobStorage
 * @param {number} id
 * @returns {Promise<void>}
 */
async function eliminarAdjunto(adjuntoRepo, versionRepo, blobStorage, id) {
  const adjunto = await buscarAdjuntoOFallar(adjuntoRepo, id);
  const version = await buscarVersionOFallar(versionRepo, adjunto.versionId);
  validarVersionEditable(version.estado);

  await adjuntoRepo.eliminar(id);
  await blobStorage.eliminar({ container: adjunto.blobContainer, blobPath: adjunto.blobPath });
}

/**
 * Recupera el adjunto y su stream de descarga desde Azure Blob Storage.
 * @param {object} adjuntoRepo
 * @param {object} blobStorage
 * @param {number} id
 * @returns {Promise<{ adjunto: object, stream: NodeJS.ReadableStream }>}
 */
async function descargarAdjunto(adjuntoRepo, blobStorage, id) {
  const adjunto = await buscarAdjuntoOFallar(adjuntoRepo, id);
  const stream  = await blobStorage.descargar({ container: adjunto.blobContainer, blobPath: adjunto.blobPath });
  if (!stream) throw errorNotFound(`El archivo de adjunto ${id} no existe en el almacenamiento`);
  return { adjunto, stream };
}

module.exports = {
  listarAdjuntos,
  agregarAdjunto,
  reemplazarAdjunto,
  eliminarAdjunto,
  descargarAdjunto,
};
