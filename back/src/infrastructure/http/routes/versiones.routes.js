/**
 * versiones.routes.js
 * Define las rutas del módulo Versiones que cuelgan de /versiones y las conecta al controller.
 * El listado y la creación cuelgan de /planogramas/:id/versiones — ver planogramas.routes.js.
 */

const { Router }         = require('express');
const controller         = require('../../../application/versiones/versiones.controller');
const gondolasController = require('../../../application/gondolas/gondolas.controller');
const adjuntosController = require('../../../application/adjuntos/adjuntos.controller');

const router = Router();

// GET   /versiones/:id                — detalle completo (góndolas → niveles → posiciones)
router.get('/:id',                  controller.obtener);

// GET   /versiones/:id/gondolas       — lista las góndolas de la versión (módulo góndolas)
router.get('/:id/gondolas',         gondolasController.listar);

// POST  /versiones/:id/gondolas       — agrega una góndola a la versión (módulo góndolas)
router.post('/:id/gondolas',        gondolasController.agregar);

// PATCH /versiones/:id/gondolas/orden — reordena las góndolas de la versión (módulo góndolas)
router.patch('/:id/gondolas/orden', gondolasController.reordenar);

// PATCH /versiones/:id                — partial update de notas y/o código
router.patch('/:id',                controller.editar);

// POST  /versiones/:id/promover       — avanza el estado (en_desarrollo→piloto, piloto→publicado)
router.post('/:id/promover',        controller.promover);

// POST  /versiones/:id/archivar       — archiva la versión manualmente (borrador/en_desarrollo/piloto)
router.post('/:id/archivar',        controller.archivar);

// GET   /versiones/:id/tiendas        — tiendas asignadas y disponibles
router.get('/:id/tiendas',          controller.obtenerTiendas);

// PUT   /versiones/:id/tiendas        — reemplaza el listado completo de tiendas asignadas
router.put('/:id/tiendas',          controller.reemplazarTiendas);

// PATCH /versiones/:id/guardar        — acción "Guardar" del editor
router.patch('/:id/guardar',        controller.guardar);

// GET   /versiones/:id/estructura     — estructura reducida de solo lectura (Implementador)
router.get('/:id/estructura',       controller.obtenerEstructura);

// GET   /versiones/:id/adjuntos       — lista los adjuntos de la versión (módulo adjuntos)
router.get('/:id/adjuntos',         adjuntosController.listar);

// POST  /versiones/:id/adjuntos       — sube un adjunto nuevo a la versión (módulo adjuntos)
router.post('/:id/adjuntos',        adjuntosController.agregar);

module.exports = router;
