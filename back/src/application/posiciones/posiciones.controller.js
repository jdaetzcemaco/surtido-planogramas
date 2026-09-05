/**
 * posiciones.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD directamente.
 */

const Joi        = require('joi');
const { PERFILES_REDONDEO, MODOS, DECISIONES } = require('../../domain/posicion/posicion.entity');
const usecases    = require('../../domain/posicion/posicion.usecases');
const posicionRepo = require('../../infrastructure/repositories/posicion.repository');
const nivelRepo    = require('../../infrastructure/repositories/nivel.repository');
const gondolaRepo  = require('../../infrastructure/repositories/gondola.repository');
const versionRepo  = require('../../infrastructure/repositories/version.repository');
const productoRepo = require('../../infrastructure/repositories/producto.repository');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaCrear = Joi.object({
  sku:                 Joi.string().trim().min(1).optional().allow(null),
  orden_horizontal:    Joi.number().integer().positive().required(),
  ancho_asignado_cm:   Joi.number().positive().required(),
  facings_horizontal:  Joi.number().integer().positive().required(),
  cantidad_apilable:   Joi.number().integer().positive().required(),
  unidades_por_facing: Joi.number().integer().positive().required(),
  capacidad_maxima:    Joi.number().integer().positive().required(),
  min_estetico:        Joi.number().integer().min(0).optional(),
  min_final:           Joi.number().integer().min(0).optional(),
  max_final:           Joi.number().integer().min(0).optional(),
  perfil_redondeo:     Joi.string().valid(...PERFILES_REDONDEO).optional(),
  modo:                Joi.string().valid(...MODOS).optional(),
  decision:            Joi.string().valid(...DECISIONES).optional(),
  nombre_detectado:    Joi.string().trim().max(500).optional().allow(null, ''),
  confidence:          Joi.number().integer().min(0).max(100).optional(),
  datos_vision:        Joi.object().unknown(true).optional().allow(null),
});

const schemaAsignarSku = Joi.object({
  sku:          Joi.string().trim().min(1).required(),
  subcategorias: Joi.array().items(Joi.string()).optional().default([]),
});

const schemaEditar = Joi.object({
  facings_horizontal:  Joi.number().integer().positive().optional(),
  ancho_asignado_cm:   Joi.number().positive().optional(),
  cantidad_apilable:   Joi.number().integer().positive().optional(),
  unidades_por_facing: Joi.number().integer().positive().optional(),
  capacidad_maxima:    Joi.number().integer().positive().allow(null).optional(),
  min_estetico:        Joi.number().integer().min(0).allow(null).optional(),
  min_final:           Joi.number().integer().min(0).allow(null).optional(),
  max_final:           Joi.number().integer().min(0).allow(null).optional(),
  perfil_redondeo:     Joi.string().valid(...PERFILES_REDONDEO).optional(),
  modo:                Joi.string().valid(...MODOS).optional(),
  cross_externo:       Joi.boolean().optional(),
  montar_en_display:   Joi.boolean().optional(),
  desborda_gondola:    Joi.boolean().optional(),
  nota_desborde:       Joi.string().trim().max(500).allow(null, '').optional(),
  decision:            Joi.string().valid(...DECISIONES).optional(),
  observaciones:       Joi.string().trim().max(500).allow(null, '').optional(),
}).min(1);

const schemaMover = Joi.object({
  nivel_id:         Joi.number().integer().positive().required(),
  orden_horizontal: Joi.number().integer().positive().required(),
});

const schemaCopiar = Joi.object({
  nivel_id_destino: Joi.number().integer().positive().required(),
  orden_destino:    Joi.number().integer().positive().required(),
});

const schemaAccesorioAgregar = Joi.object({
  accesorio_id: Joi.number().integer().positive().required(),
  nota_libre:   Joi.string().trim().max(200).allow(null, '').optional(),
});

const schemaPorSkuQuery = Joi.object({
  sku:       Joi.string().trim().min(1).required(),
  versionId: Joi.number().integer().positive().required(),
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
  if (error) {
    throw error;
  }
  return value;
}

// ─── Handlers — colección (cuelgan de /niveles/:id/posiciones) ──────────────

async function listar(req, res, next) {
  try {
    const nivelId    = parsearId(req.params.id);
    const resultado  = await usecases.listarPosiciones(posicionRepo, nivelRepo, nivelId);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function agregar(req, res, next) {
  try {
    const nivelId  = parsearId(req.params.id);
    const datos    = validarBody(schemaCrear, req.body);
    const posicion = await usecases.agregarPosicion(
      posicionRepo, nivelRepo, gondolaRepo, versionRepo, productoRepo, nivelId, datos,
    );
    res.status(201).json(posicion);
  } catch (err) {
    next(err);
  }
}

// ─── Handlers — recurso (cuelgan de /posiciones) ────────────────────────────

async function obtener(req, res, next) {
  try {
    const id       = parsearId(req.params.id);
    const posicion = await usecases.obtenerPosicion(posicionRepo, id);
    res.json(posicion);
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const id       = parsearId(req.params.id);
    const cambios  = validarBody(schemaEditar, req.body);
    const posicion = await usecases.editarPosicion(posicionRepo, nivelRepo, gondolaRepo, versionRepo, id, cambios);
    res.json(posicion);
  } catch (err) {
    next(err);
  }
}

async function mover(req, res, next) {
  try {
    const id        = parsearId(req.params.id);
    const datos     = validarBody(schemaMover, req.body);
    const resultado = await usecases.moverPosicion(
      posicionRepo, nivelRepo, gondolaRepo, versionRepo, id, datos.nivel_id, datos.orden_horizontal,
    );
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function copiar(req, res, next) {
  try {
    const id       = parsearId(req.params.id);
    const datos    = validarBody(schemaCopiar, req.body);
    const posicion = await usecases.copiarPosicion(
      posicionRepo, nivelRepo, gondolaRepo, versionRepo, id, datos.nivel_id_destino, datos.orden_destino,
    );
    res.status(201).json(posicion);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const id = parsearId(req.params.id);
    await usecases.eliminarPosicion(posicionRepo, nivelRepo, gondolaRepo, versionRepo, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Handlers — accesorios de montaje ───────────────────────────────────────

async function listarAccesorios(req, res, next) {
  try {
    const id         = parsearId(req.params.id);
    const accesorios = await usecases.listarAccesorios(posicionRepo, id);
    res.json(accesorios);
  } catch (err) {
    next(err);
  }
}

async function agregarAccesorio(req, res, next) {
  try {
    const posicionId = parsearId(req.params.id);
    const datos       = validarBody(schemaAccesorioAgregar, req.body);
    const accesorio   = await usecases.agregarAccesorio(posicionRepo, nivelRepo, gondolaRepo, versionRepo, posicionId, datos);
    res.status(201).json(accesorio);
  } catch (err) {
    next(err);
  }
}

async function eliminarAccesorio(req, res, next) {
  try {
    const posicionId  = parsearId(req.params.id);
    const accesorioId = parsearId(req.params.accesorioId);
    await usecases.eliminarAccesorio(posicionRepo, nivelRepo, gondolaRepo, versionRepo, posicionId, accesorioId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── Handlers — búsqueda por SKU ─────────────────────────────────────────────

async function buscarPorSku(req, res, next) {
  try {
    const query     = validarBody(schemaPorSkuQuery, req.query);
    const resultado = await usecases.buscarPorSku(posicionRepo, versionRepo, query.sku, query.versionId);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}


async function asignarSku(req, res, next) {
  try {
    const id    = Number(req.params.id);
    const datos = validarBody(schemaAsignarSku, req.body);
    const posicion = await usecases.asignarSku(
      posicionRepo, nivelRepo, gondolaRepo, versionRepo, productoRepo,
      id, datos,
    );
    res.json(posicion);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  agregar,
  obtener,
  editar,
  mover,
  copiar,
  eliminar,
  asignarSku,
  listarAccesorios,
  agregarAccesorio,
  eliminarAccesorio,
  buscarPorSku,
};
