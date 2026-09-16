/**
 * blobClient.js
 * Cliente de Azure Blob Storage para el módulo de adjuntos.
 * El contenedor es privado (la cuenta tiene deshabilitado el acceso anónimo al blob) — la
 * descarga real siempre pasa por el endpoint propio del backend (GET /adjuntos/:id/descargar);
 * nunca se expone blob_url como link directo al frontend.
 */

const { BlobServiceClient } = require('@azure/storage-blob');
const env = require('../../config/env');

function errorServicioNoDisponible(mensaje, causa) {
  const err = new Error(mensaje);
  err.status = 503;
  err.code   = 'SERVICE_UNAVAILABLE';
  if (causa) err.details = causa.message;
  return err;
}

let serviceClient = null;

function obtenerServiceClient() {
  if (!serviceClient) {
    serviceClient = BlobServiceClient.fromConnectionString(env.azureStorage.connectionString);
  }
  return serviceClient;
}

function obtenerContainerClient(container) {
  return obtenerServiceClient().getContainerClient(container);
}

// ─── subir ───────────────────────────────────────────────────────────────────
// createIfNotExists() sin `access` deja el contenedor privado por default — coherente con que
// la cuenta ya tiene el acceso anónimo al blob deshabilitado a nivel de cuenta.

async function subir({ container, blobPath, buffer, contentType }) {
  try {
    const containerClient = obtenerContainerClient(container);
    await containerClient.createIfNotExists();

    const blobClient = containerClient.getBlockBlobClient(blobPath);
    await blobClient.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });

    return { url: blobClient.url };
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo subir el archivo a Azure Blob Storage', err);
  }
}

// ─── descargar ───────────────────────────────────────────────────────────────

async function descargar({ container, blobPath }) {
  try {
    const blobClient = obtenerContainerClient(container).getBlockBlobClient(blobPath);
    const respuesta  = await blobClient.download();
    return respuesta.readableStreamBody;
  } catch (err) {
    if (err.statusCode === 404) return null;
    throw errorServicioNoDisponible('No se pudo descargar el archivo desde Azure Blob Storage', err);
  }
}

// ─── eliminar ────────────────────────────────────────────────────────────────

async function eliminar({ container, blobPath }) {
  try {
    const blobClient = obtenerContainerClient(container).getBlockBlobClient(blobPath);
    await blobClient.deleteIfExists();
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo eliminar el archivo de Azure Blob Storage', err);
  }
}

module.exports = {
  container: env.azureStorage.container,
  subir,
  descargar,
  eliminar,
};
