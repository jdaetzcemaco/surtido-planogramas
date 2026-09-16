/**
 * adjuntos.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * El archivo viaja en el body como base64 (mismo patrón que el Agente Extractor de Imagen
 * Numerada, ver extractorImagenNumerada.controller.js) — no se usa multipart/form-data.
 * No contiene lógica de negocio ni accede a la BD ni a Azure Storage directamente.
 */

const Joi         = require('joi');
const usecases    = require('../../domain/adjunto/adjunto.usecases');
const { MIME_TYPES_PERMITIDOS } = require('../../domain/adjunto/adjunto.entity');
const adjuntoRepo = require('../../infrastructure/repositories/adjunto.repository');
const versionRepo = require('../../infrastructure/repositories/version.repository');
const blobStorage = require('../../infrastructure/storage/blobClient');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaArchivo = Joi.object({
  nombre_original: Joi.string().trim().min(1).max(255).required(),
  tipo_mime:       Joi.string().valid(...MIME_TYPES_PERMITIDOS).required(),
  archivo_base64:  Joi.string().trim().min(1).required(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsearId(valor) {
  const id = parseInt(valor, 10);
  if (isNaN(id) || id < 1) {
    const err = new Error('El id debe ser un entero positivo');
    err.status = 400;
    err.code   = 'VALIDATION_ERROR';
    throw err;
  }
  return id;
}

function validarBody(schema, body) {
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function listar(req, res, next) {
  try {
    const versionId = parsearId(req.params.id);
    const adjuntos  = await usecases.listarAdjuntos(adjuntoRepo, versionRepo, versionId);
    res.json(adjuntos);
  } catch (err) {
    next(err);
  }
}

async function agregar(req, res, next) {
  try {
    const versionId = parsearId(req.params.id);
    const datos     = validarBody(schemaArchivo, req.body);
    // TODO: reemplazar 'sistema' por el usuario autenticado cuando exista el middleware de CAO.
    const adjunto   = await usecases.agregarAdjunto(adjuntoRepo, versionRepo, blobStorage, versionId, datos, 'sistema');
    res.status(201).json(adjunto);
  } catch (err) {
    next(err);
  }
}

async function reemplazar(req, res, next) {
  try {
    const id      = parsearId(req.params.id);
    const datos   = validarBody(schemaArchivo, req.body);
    const adjunto = await usecases.reemplazarAdjunto(adjuntoRepo, versionRepo, blobStorage, id, datos, 'sistema');
    res.json(adjunto);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const id = parsearId(req.params.id);
    await usecases.eliminarAdjunto(adjuntoRepo, versionRepo, blobStorage, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function descargar(req, res, next) {
  try {
    const id = parsearId(req.params.id);
    const { adjunto, stream } = await usecases.descargarAdjunto(adjuntoRepo, blobStorage, id);

    res.setHeader('Content-Type', adjunto.tipoMime);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(adjunto.nombreOriginal)}"`);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, agregar, reemplazar, eliminar, descargar };
