/**
 * adjunto.entity.js
 * Reglas de negocio puras del dominio Adjunto.
 * Sin dependencias de Express, Knex, ni del SDK de Azure Storage.
 */

const crypto = require('crypto');

/** Estados de PlanogramaVersion en los que se admite añadir/eliminar/reemplazar adjuntos. */
const ESTADOS_VERSION_EDITABLE = Object.freeze(['borrador', 'en_desarrollo', 'piloto']);

const MIME_TYPES_PERMITIDOS = Object.freeze([
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
]);

// El body JSON global admite hasta 8mb (ver app.js) y el archivo viaja como base64 (~33% de
// overhead sobre el binario) — 5MB de binario deja margen suficiente dentro de ese límite.
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

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
 * Valida que la versión padre esté en un estado que admite editar sus adjuntos.
 * @param {string} estadoVersion
 */
function validarVersionEditable(estadoVersion) {
  if (!ESTADOS_VERSION_EDITABLE.includes(estadoVersion)) {
    throw errorUnprocessable('La versión no está en modo editable', { estadoActual: estadoVersion });
  }
}

/**
 * Valida el tipo MIME y el tamaño del archivo antes de subirlo.
 * @param {{ tipoMime: string, tamanoBytes: number }} datos
 */
function validarArchivo({ tipoMime, tamanoBytes }) {
  if (!MIME_TYPES_PERMITIDOS.includes(tipoMime)) {
    throw errorBadRequest(
      `Tipo de archivo no permitido: ${tipoMime}. Permitidos: ${MIME_TYPES_PERMITIDOS.join(', ')}`,
    );
  }
  if (tamanoBytes > TAMANO_MAXIMO_BYTES) {
    throw errorBadRequest(
      `El archivo excede el tamaño máximo permitido (${TAMANO_MAXIMO_BYTES / (1024 * 1024)}MB)`,
    );
  }
}

/**
 * Genera una ruta de blob única dentro del contenedor, con el nombre original sanitizado.
 * @param {number} versionId
 * @param {string} nombreOriginal
 * @returns {string}
 */
function generarBlobPath(versionId, nombreOriginal) {
  const sufijo           = crypto.randomUUID();
  const nombreSanitizado = nombreOriginal.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `versiones/${versionId}/${sufijo}-${nombreSanitizado}`;
}

module.exports = {
  ESTADOS_VERSION_EDITABLE,
  MIME_TYPES_PERMITIDOS,
  TAMANO_MAXIMO_BYTES,
  validarVersionEditable,
  validarArchivo,
  generarBlobPath,
};
