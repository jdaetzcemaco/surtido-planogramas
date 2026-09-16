/**
 * adjuntos.routes.js
 * Define las rutas del módulo Adjuntos que cuelgan de /adjuntos y las conecta al controller.
 * El listado y la creación cuelgan de /versiones/:id/adjuntos — ver versiones.routes.js.
 */

const { Router } = require('express');
const controller = require('../../../application/adjuntos/adjuntos.controller');

const router = Router();

// GET    /adjuntos/:id/descargar — descarga el archivo (streaming desde Azure Blob Storage)
router.get('/:id/descargar', controller.descargar);

// PUT    /adjuntos/:id           — reemplaza el archivo, conservando el mismo id
router.put('/:id',            controller.reemplazar);

// DELETE /adjuntos/:id           — elimina el adjunto (fila + blob en Azure)
router.delete('/:id',         controller.eliminar);

module.exports = router;
