/**
 * routes/index.js
 * Router raíz — monta todos los sub-routers bajo /api/v1.
 * Agregar aquí cada nuevo módulo a medida que se desarrolle.
 */

const { Router } = require('express');

const router = Router();

// ─── Health check ─────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Módulos de negocio (se irán montando aquí) ───────────────────────────────
router.use('/planogramas',    require('./planogramas.routes'));
router.use('/versiones',      require('./versiones.routes'));
router.use('/gondolas',       require('./gondolas.routes'));
router.use('/adjuntos',       require('./adjuntos.routes'));
router.use('/niveles',        require('./niveles.routes'));
router.use('/posiciones',     require('./posiciones.routes'));
router.use('/accesorios',     require('./accesorios.routes'));
router.use('/tiendas',        require('./tiendas.routes'));
router.use('/jerarquia',      require('./jerarquia.routes'));
router.use('/catalog',        require('./catalogo.routes'));
router.use('/catalog',        require('./producto.routes'));
router.use('/agente-extractor', require('./agenteExtractor.routes'));

module.exports = router;
