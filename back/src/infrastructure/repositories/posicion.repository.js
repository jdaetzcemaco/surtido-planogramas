/**
 * posicion.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 */

const db = require('../db/connection');

const TABLA_POSICION           = 'Posicion';
const TABLA_POSICION_ACCESORIO = 'PosicionAccesorio';
const TABLA_ACCESORIO          = 'Accesorio';
const TABLA_PRODUCTO           = 'Producto';
const TABLA_NIVEL              = 'Nivel';
const TABLA_GONDOLA            = 'Gondola';

const CAMPOS_EDITABLES = [
  'facings_horizontal',
  'ancho_asignado_cm',
  'cantidad_apilable',
  'unidades_por_facing',
  'capacidad_maxima',
  'min_estetico',
  'min_final',
  'max_final',
  'perfil_redondeo',
  'modo',
  'cross_externo',
  'montar_en_display',
  'desborda_gondola',
  'nota_desborde',
  'decision',
  'observaciones',
  'sku',
  'nombre_detectado',
  'confidence',
  'datos_vision',
];

// ─── Helpers privados ────────────────────────────────────────────────────────

function mapPosicion(row) {
  return {
    id:                  row.id,
    nivelId:             row.nivel_id,
    sku:                 row.sku ?? null,
    orden_horizontal:    row.orden_horizontal,
    ancho_asignado_cm:   Number(row.ancho_asignado_cm),
    facings_horizontal:  row.facings_horizontal,
    cantidad_apilable:   row.cantidad_apilable,
    unidades_por_facing: row.unidades_por_facing,
    capacidad_maxima:    row.capacidad_maxima,
    min_estetico:        row.min_estetico,
    min_final:           row.min_final,
    max_final:           row.max_final,
    perfil_redondeo:     row.perfil_redondeo,
    modo:                row.modo,
    cross_externo:       Boolean(row.cross_externo),
    montar_en_display:   Boolean(row.montar_en_display),
    desborda_gondola:    Boolean(row.desborda_gondola),
    nota_desborde:       row.nota_desborde,
    decision:            row.decision,
    observaciones:       row.observaciones,
    nombre_detectado:    row.nombre_detectado ?? null,
    confidence:          row.confidence ?? 100,
    datos_vision:        row.datos_vision ? JSON.parse(row.datos_vision) : null,
  };
}

/**
 * Adjunta datos livianos de `Producto` (nombre/imagen/ancho) a una posición ya mapeada — usado
 * únicamente por `listarPorNivel` para pintar tarjetas sin un request por SKU. A diferencia de
 * GET /posiciones/{id} (vista Analista, ver GET_posiciones_detalle_analista.md), este listado no
 * tiene la restricción de "sin enriquecimiento": solo lee la tabla local `Producto` ya
 * sincronizada, sin llamar a CATI.
 */
function mapPosicionConProducto(row) {
  return {
    ...mapPosicion(row),
    producto: row.producto_nombre != null || row.producto_imagen_url != null || row.producto_ancho_cm != null
      ? {
          nombre:     row.producto_nombre ?? null,
          imagen_url: row.producto_imagen_url ?? null,
          ancho_cm:   row.producto_ancho_cm != null ? Number(row.producto_ancho_cm) : null,
        }
      : null,
  };
}

/** Forma "embebida" de accesorio usada en GET /posiciones/{id} — ver GET_posiciones_detalle_analista.md. */
function mapAccesorioEmbebido(row) {
  return {
    id:           row.id,
    accesorio_id: row.accesorio_id,
    codigo:       row.codigo,
    nombre:       row.nombre,
    tipo:         row.tipo,
    nota_libre:   row.nota_libre,
  };
}

/** Forma "completa" de accesorio usada en GET/POST /posiciones/{id}/accesorios — ver GET_posiciones_accesorios.md. */
function mapAccesorioCompleto(row) {
  return {
    id:         row.id,
    posicionId: row.posicion_id,
    accesorio: {
      id:          row.accesorio_id,
      codigo:      row.codigo,
      nombre:      row.nombre,
      tipo:        row.tipo,
      longitud_cm: row.longitud_cm != null ? Number(row.longitud_cm) : null,
    },
    nota_libre: row.nota_libre,
    orden:      row.orden,
  };
}

function accesoriosDePosicionQuery(posicionId) {
  return db(TABLA_POSICION_ACCESORIO)
    .join(TABLA_ACCESORIO, `${TABLA_POSICION_ACCESORIO}.accesorio_id`, `${TABLA_ACCESORIO}.id`)
    .where(`${TABLA_POSICION_ACCESORIO}.posicion_id`, posicionId)
    .orderBy(`${TABLA_POSICION_ACCESORIO}.orden`, 'asc')
    .select(
      `${TABLA_POSICION_ACCESORIO}.id as id`,
      `${TABLA_POSICION_ACCESORIO}.posicion_id as posicion_id`,
      `${TABLA_POSICION_ACCESORIO}.orden as orden`,
      `${TABLA_POSICION_ACCESORIO}.nota_libre as nota_libre`,
      `${TABLA_ACCESORIO}.id as accesorio_id`,
      `${TABLA_ACCESORIO}.codigo as codigo`,
      `${TABLA_ACCESORIO}.nombre as nombre`,
      `${TABLA_ACCESORIO}.tipo as tipo`,
      `${TABLA_ACCESORIO}.longitud_cm as longitud_cm`,
    );
}

// ─── listarPorNivel ──────────────────────────────────────────────────────────

async function listarPorNivel(nivelId) {
  const rows = await db(TABLA_POSICION)
    .leftJoin(TABLA_PRODUCTO, `${TABLA_POSICION}.sku`, `${TABLA_PRODUCTO}.sku`)
    .where(`${TABLA_POSICION}.nivel_id`, nivelId)
    .orderBy(`${TABLA_POSICION}.orden_horizontal`, 'asc')
    .select(
      `${TABLA_POSICION}.*`,
      `${TABLA_PRODUCTO}.nombre as producto_nombre`,
      `${TABLA_PRODUCTO}.imagen_url as producto_imagen_url`,
      `${TABLA_PRODUCTO}.ancho_cm as producto_ancho_cm`,
    );
  return rows.map(mapPosicionConProducto);
}

// ─── buscarPorId ─────────────────────────────────────────────────────────────

async function buscarPorId(id) {
  const row = await db(TABLA_POSICION).where('id', id).first();
  return row ? mapPosicion(row) : null;
}

// ─── buscarPorIdConAccesorios ────────────────────────────────────────────────

async function buscarPorIdConAccesorios(id) {
  const posicion = await buscarPorId(id);
  if (!posicion) return null;

  const accesorios = await accesoriosDePosicionQuery(id);
  return { ...posicion, accesorios: accesorios.map(mapAccesorioEmbebido) };
}

// ─── crear ───────────────────────────────────────────────────────────────────

async function crear(datos) {
  const [{ id }] = await db(TABLA_POSICION).insert(datos).returning('id');
  return id;
}

// ─── actualizar ──────────────────────────────────────────────────────────────

async function actualizar(id, cambios) {
  const campos = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (cambios[campo] !== undefined) campos[campo] = cambios[campo];
  }

  if (Object.keys(campos).length > 0) {
    await db(TABLA_POSICION).where('id', id).update(campos);
  }
}

// ─── mover ───────────────────────────────────────────────────────────────────
// Reajusta orden_horizontal en el nivel origen y destino en una sola transacción
// — ver PATCH_posiciones_mover.md.

async function mover({ posicionId, nivelOrigenId, ordenOrigen, nivelDestinoId, ordenDestino }) {
  await db.transaction(async (trx) => {
    if (nivelOrigenId === nivelDestinoId) {
      if (ordenDestino > ordenOrigen) {
        await trx(TABLA_POSICION)
          .where('nivel_id', nivelOrigenId)
          .where('orden_horizontal', '>', ordenOrigen)
          .where('orden_horizontal', '<=', ordenDestino)
          .decrement('orden_horizontal', 1);
      } else if (ordenDestino < ordenOrigen) {
        await trx(TABLA_POSICION)
          .where('nivel_id', nivelOrigenId)
          .where('orden_horizontal', '>=', ordenDestino)
          .where('orden_horizontal', '<', ordenOrigen)
          .increment('orden_horizontal', 1);
      }
    } else {
      await trx(TABLA_POSICION)
        .where('nivel_id', nivelOrigenId)
        .where('orden_horizontal', '>', ordenOrigen)
        .decrement('orden_horizontal', 1);

      await trx(TABLA_POSICION)
        .where('nivel_id', nivelDestinoId)
        .where('orden_horizontal', '>=', ordenDestino)
        .increment('orden_horizontal', 1);
    }

    await trx(TABLA_POSICION)
      .where('id', posicionId)
      .update({ nivel_id: nivelDestinoId, orden_horizontal: ordenDestino });
  });
}

// ─── copiar ──────────────────────────────────────────────────────────────────
// Clona la posición y sus PosicionAccesorio en una sola transacción — ver POST_posiciones_copiar.md.

async function copiar(posicionOriginalId, nivelDestinoId, ordenDestino) {
  return db.transaction(async (trx) => {
    const original = await trx(TABLA_POSICION).where('id', posicionOriginalId).first();
    const { id: _id, nivel_id: _nivelId, orden_horizontal: _ordenHorizontal, ...datos } = original;

    const [{ id: nuevaId }] = await trx(TABLA_POSICION)
      .insert({ ...datos, nivel_id: nivelDestinoId, orden_horizontal: ordenDestino })
      .returning('id');

    const accesorios = await trx(TABLA_POSICION_ACCESORIO).where('posicion_id', posicionOriginalId);

    if (accesorios.length > 0) {
      const filas = accesorios.map(({ id: _acId, posicion_id: _posicionId, ...resto }) => ({
        ...resto,
        posicion_id: nuevaId,
      }));
      await trx(TABLA_POSICION_ACCESORIO).insert(filas);
    }

    return nuevaId;
  });
}

// ─── eliminarYReajustar ──────────────────────────────────────────────────────

async function eliminarYReajustar(id) {
  await db.transaction(async (trx) => {
    const posicion = await trx(TABLA_POSICION).where('id', id).select('nivel_id', 'orden_horizontal').first();

    await trx(TABLA_POSICION_ACCESORIO).where('posicion_id', id).delete();
    await trx(TABLA_POSICION).where('id', id).delete();

    await trx(TABLA_POSICION)
      .where('nivel_id', posicion.nivel_id)
      .where('orden_horizontal', '>', posicion.orden_horizontal)
      .decrement('orden_horizontal', 1);
  });
}

// ─── listarAccesorios ────────────────────────────────────────────────────────

async function listarAccesorios(posicionId) {
  const rows = await accesoriosDePosicionQuery(posicionId);
  return rows.map(mapAccesorioCompleto);
}

// ─── accesorioExiste ─────────────────────────────────────────────────────────

async function accesorioExiste(accesorioId) {
  const row = await db(TABLA_ACCESORIO).where('id', accesorioId).select('id').first();
  return Boolean(row);
}

// ─── agregarAccesorio ────────────────────────────────────────────────────────

async function agregarAccesorio(posicionId, datos) {
  return db.transaction(async (trx) => {
    const [{ max }] = await trx(TABLA_POSICION_ACCESORIO).where('posicion_id', posicionId).max('orden as max');
    const orden = (max ?? 0) + 1;

    const [{ id }] = await trx(TABLA_POSICION_ACCESORIO)
      .insert({
        posicion_id:  posicionId,
        accesorio_id: datos.accesorio_id,
        nota_libre:   datos.nota_libre ?? null,
        orden,
      })
      .returning('id');

    return id;
  });
}

// ─── buscarAccesorioPorId ────────────────────────────────────────────────────

async function buscarAccesorioPorId(posicionAccesorioId) {
  const row = await db(TABLA_POSICION_ACCESORIO)
    .join(TABLA_ACCESORIO, `${TABLA_POSICION_ACCESORIO}.accesorio_id`, `${TABLA_ACCESORIO}.id`)
    .where(`${TABLA_POSICION_ACCESORIO}.id`, posicionAccesorioId)
    .select(
      `${TABLA_POSICION_ACCESORIO}.id as id`,
      `${TABLA_POSICION_ACCESORIO}.posicion_id as posicion_id`,
      `${TABLA_POSICION_ACCESORIO}.orden as orden`,
      `${TABLA_POSICION_ACCESORIO}.nota_libre as nota_libre`,
      `${TABLA_ACCESORIO}.id as accesorio_id`,
      `${TABLA_ACCESORIO}.codigo as codigo`,
      `${TABLA_ACCESORIO}.nombre as nombre`,
      `${TABLA_ACCESORIO}.tipo as tipo`,
      `${TABLA_ACCESORIO}.longitud_cm as longitud_cm`,
    )
    .first();

  return row ? mapAccesorioCompleto(row) : null;
}

// ─── eliminarAccesorio ───────────────────────────────────────────────────────

async function eliminarAccesorio(posicionAccesorioId) {
  await db(TABLA_POSICION_ACCESORIO).where('id', posicionAccesorioId).delete();
}

// ─── buscarPorSkuEnVersion ───────────────────────────────────────────────────

async function buscarPorSkuEnVersion(sku, versionId) {
  const posiciones = await db(TABLA_POSICION)
    .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .where(`${TABLA_GONDOLA}.planograma_version_id`, versionId)
    .where(`${TABLA_POSICION}.sku`, sku)
    .orderBy(`${TABLA_GONDOLA}.orden`, 'asc')
    .orderBy(`${TABLA_NIVEL}.orden`, 'asc')
    .orderBy(`${TABLA_POSICION}.orden_horizontal`, 'asc')
    .select(
      `${TABLA_POSICION}.id as id`,
      `${TABLA_GONDOLA}.nombre as gondolaNombre`,
      `${TABLA_NIVEL}.orden as nivelOrden`,
      `${TABLA_POSICION}.orden_horizontal as orden_horizontal`,
    );

  const producto = await db(TABLA_PRODUCTO).where('sku', sku).select('sku_sustituto').first();

  return {
    sku,
    totalPosicionesEnVersion: posiciones.length,
    skuSustitutoRecomendado:  producto?.sku_sustituto ?? null,
    posiciones,
  };
}

// ─── Exportación ─────────────────────────────────────────────────────────────


async function actualizarAsignacionSku(id, { sku, modo, confidence, nombre_detectado, ancho_asignado_cm }) {
  await db(TABLA_POSICION)
    .where('id', id)
    .update({ sku, modo, confidence, nombre_detectado, ancho_asignado_cm });
}

module.exports = {
  listarPorNivel,
  buscarPorId,
  buscarPorIdConAccesorios,
  crear,
  actualizar,
  mover,
  copiar,
  eliminarYReajustar,
  listarAccesorios,
  accesorioExiste,
  agregarAccesorio,
  buscarAccesorioPorId,
  eliminarAccesorio,
  buscarPorSkuEnVersion,
};
