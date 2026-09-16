/**
 * adjunto.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');

const TABLA_ADJUNTO = 'Adjunto';

// ─── Helpers privados ────────────────────────────────────────────────────────

function mapAdjunto(row) {
  return {
    id:             row.id,
    versionId:      row.planograma_version_id,
    nombreOriginal: row.nombre_original,
    tipoMime:       row.tipo_mime,
    tamanoBytes:    row.tamano_bytes,
    blobContainer:  row.blob_container,
    blobPath:       row.blob_path,
    blobUrl:        row.blob_url,
    subidoPor:      row.subido_por,
    createdAt:      row.created_at,
  };
}

// ─── listarPorVersion ────────────────────────────────────────────────────────

async function listarPorVersion(versionId) {
  const rows = await db(TABLA_ADJUNTO)
    .where('planograma_version_id', versionId)
    .orderBy('created_at', 'desc');

  return rows.map(mapAdjunto);
}

// ─── buscarPorId ─────────────────────────────────────────────────────────────

async function buscarPorId(id) {
  const row = await db(TABLA_ADJUNTO).where('id', id).first();
  return row ? mapAdjunto(row) : null;
}

// ─── crear ───────────────────────────────────────────────────────────────────

async function crear(adjunto) {
  const [{ id }] = await db(TABLA_ADJUNTO).insert(adjunto).returning('id');
  return id;
}

// ─── actualizarArchivo ───────────────────────────────────────────────────────

async function actualizarArchivo(id, campos) {
  await db(TABLA_ADJUNTO).where('id', id).update(campos);
}

// ─── eliminar ────────────────────────────────────────────────────────────────

async function eliminar(id) {
  await db(TABLA_ADJUNTO).where('id', id).delete();
}

// ─── Exportación ─────────────────────────────────────────────────────────────

module.exports = {
  listarPorVersion,
  buscarPorId,
  crear,
  actualizarArchivo,
  eliminar,
};
