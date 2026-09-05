/**
 * extractorFacings.controller.js
 * Recibe una foto ya aplanada (ver Lienzo, front/src/utils/lienzoWarp.ts), la delega al Agente
 * Extractor de Facings (back/src/agents/) y devuelve los recuadros detectados. Sin persistencia —
 * es una capa de localización visual sobre la imagen, no toca el planograma.
 */

const Joi = require('joi');
const { extractorFacings } = require('../../agents');
const openaiClient = require('../../agents/openaiClient');

const MIME_TYPES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

const schemaImagen = Joi.object({
  imagen_base64: Joi.string().trim().min(1).required(),
  mime_type: Joi.string().valid(...MIME_TYPES_PERMITIDOS).required(),
});

function validarBody(schema, body) {
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}

async function procesarImagen(req, res, next) {
  try {
    const datos = validarBody(schemaImagen, req.body);
    const resultado = await extractorFacings.procesarImagen(
      { imagenBase64: datos.imagen_base64, mimeType: datos.mime_type },
      { openaiClient },
    );

    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { procesarImagen };
