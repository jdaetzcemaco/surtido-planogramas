/**
 * agenteExtractor.routes.js
 * Define las rutas del Agente Extractor del Planograma y las conecta al controller.
 */

const { Router } = require('express');
const controller = require('../../../application/agenteExtractor/agenteExtractor.controller');
const controllerImagen = require('../../../application/agenteExtractor/extractorImagenNumerada.controller');
const controllerFacings = require('../../../application/agenteExtractor/extractorFacings.controller');

const router = Router();

// POST /agente-extractor/mensaje — envía un mensaje del chat y recibe la respuesta + borrador
router.post('/mensaje', controller.procesarMensaje);

// POST /agente-extractor/imagen — interpreta una foto de mueble numerado (niveles/SKUs/facings)
router.post('/imagen', controllerImagen.procesarImagen);

// POST /agente-extractor/facings — ubica un recuadro por cada facing en una foto ya aplanada (Lienzo)
router.post('/facings', controllerFacings.procesarImagen);

module.exports = router;
