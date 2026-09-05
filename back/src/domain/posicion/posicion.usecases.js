/**
 * posicion.usecases.js
 * Casos de uso del dominio Posicion.
 * Reciben el repositorio por inyección de dependencia — sin imports de infraestructura.
 *
 * Las operaciones de escritura reciben también los repositorios de Nivel, Gondola y Version,
 * inyectados desde el controlador, para resolver el nivel dueño y validar que la versión
 * padre esté en un estado editable — mismo patrón usado en los módulos gondola/nivel.
 */

const {
  validarVersionEditable,
  validarDesborde,
  validarMinMax,
  calcularAdvertenciaEspacio,
  calcularAnchoAsignado,
  CONFIDENCE_CONFIRMADO,
} = require('./posicion.entity');

// ─── Helpers privados ────────────────────────────────────────────────────────

function errorBadRequest(mensaje) {
  const err = new Error(mensaje);
  err.status = 400;
  err.code   = 'VALIDATION_ERROR';
  return err;
}

function errorNotFound(mensaje) {
  const err = new Error(mensaje);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

function errorUnprocessable(mensaje, details) {
  const err = new Error(mensaje);
  err.status = 422;
  err.code   = 'UNPROCESSABLE';
  if (details) err.details = details;
  return err;
}

async function buscarNivelOFallar(nivelRepo, id) {
  const nivel = await nivelRepo.buscarPorId(id);
  if (!nivel) throw errorNotFound(`Nivel ${id} no encontrado`);
  return nivel;
}

async function buscarGondolaOFallar(gondolaRepo, id) {
  const gondola = await gondolaRepo.buscarPorId(id);
  if (!gondola) throw errorNotFound(`Góndola ${id} no encontrada`);
  return gondola;
}

async function buscarVersionOFallar(versionRepo, versionId) {
  const version = await versionRepo.buscarPorId(versionId);
  if (!version) throw errorNotFound(`Versión ${versionId} no encontrada`);
  return version;
}

async function buscarPosicionOFallar(posicionRepo, id) {
  const posicion = await posicionRepo.buscarPorId(id);
  if (!posicion) throw errorNotFound(`Posición ${id} no encontrada`);
  return posicion;
}

/** Resuelve la versión dueña de un nivel (nivel → góndola → versión). */
async function versionDelNivel(nivelRepo, gondolaRepo, versionRepo, nivelId) {
  const nivel   = await buscarNivelOFallar(nivelRepo, nivelId);
  const gondola = await buscarGondolaOFallar(gondolaRepo, nivel.gondolaId);
  const version = await buscarVersionOFallar(versionRepo, gondola.versionId);
  return { nivel, gondola, version };
}

/** Carga nivel + versión de una posición y valida que la versión sea editable. */
async function validarVersionDeLaPosicion(nivelRepo, gondolaRepo, versionRepo, posicion) {
  const { version } = await versionDelNivel(nivelRepo, gondolaRepo, versionRepo, posicion.nivelId);
  validarVersionEditable(version.estado);
  return version;
}

// ─── Casos de uso — lectura ──────────────────────────────────────────────────

/**
 * Lista las posiciones de un nivel junto con la capacidad disponible restante.
 * @returns {Promise<{ posiciones: object[], capacidad: { ancho_disponible_cm, ancho_ocupado_cm, ancho_libre_cm } }>}
 */
async function listarPosiciones(posicionRepo, nivelRepo, nivelId) {
  const nivel      = await buscarNivelOFallar(nivelRepo, nivelId);
  const posiciones = await posicionRepo.listarPorNivel(nivelId);
  const anchoOcupado = await nivelRepo.anchoOcupadoCm(nivelId);

  return {
    posiciones,
    capacidad: {
      ancho_disponible_cm: nivel.ancho_disponible_cm,
      ancho_ocupado_cm:    anchoOcupado,
      ancho_libre_cm:      nivel.ancho_disponible_cm - anchoOcupado,
    },
  };
}

/** Retorna el detalle de una posición para el panel de edición del Analista (CU-04-02). */
async function obtenerPosicion(posicionRepo, id) {
  const posicion = await posicionRepo.buscarPorIdConAccesorios(id);
  if (!posicion) throw errorNotFound(`Posición ${id} no encontrada`);
  return posicion;
}

/** Lista los accesorios de montaje de una posición. */
async function listarAccesorios(posicionRepo, id) {
  await buscarPosicionOFallar(posicionRepo, id);
  return posicionRepo.listarAccesorios(id);
}

/** Busca todas las posiciones de un SKU dentro de una versión (CU-05-01, paso inicial). */
async function buscarPorSku(posicionRepo, versionRepo, sku, versionId) {
  await buscarVersionOFallar(versionRepo, versionId);
  return posicionRepo.buscarPorSkuEnVersion(sku, versionId);
}

// ─── Casos de uso — escritura ────────────────────────────────────────────────

/**
 * Agrega una posición nueva a un nivel. Verifica espacio disponible pero no bloquea
 * — retorna una advertencia no bloqueante si el nivel queda en desborde (CU-04-01).
 * El SKU se garantiza contra el catálogo local, nutriéndolo desde CATI si hace falta
 * (ver productoRepo.asegurarExistencia).
 */
async function agregarPosicion(posicionRepo, nivelRepo, gondolaRepo, versionRepo, productoRepo, nivelId, datos) {
  const { nivel, version } = await versionDelNivel(nivelRepo, gondolaRepo, versionRepo, nivelId);
  validarVersionEditable(version.estado);

  if (datos.sku != null) {
    const productoExiste = await productoRepo.asegurarExistencia(datos.sku);
    if (!productoExiste) {
      throw errorBadRequest(`El SKU '${datos.sku}' no existe en el catálogo local ni en CATI`);
    }
  }

  const anchoOcupado = await nivelRepo.anchoOcupadoCm(nivelId);
  const advertencia = calcularAdvertenciaEspacio({
    anchoOcupado,
    anchoNuevo:      datos.ancho_asignado_cm,
    anchoDisponible: nivel.ancho_disponible_cm,
  });

  const id = await posicionRepo.crear({
    nivel_id:            nivelId,
    orden_horizontal:    datos.orden_horizontal,
    sku:                 datos.sku ?? null,
    nombre_detectado:    datos.nombre_detectado ?? null,
    confidence:          datos.confidence ?? CONFIDENCE_CONFIRMADO,
    datos_vision:        datos.datos_vision ?? null,
    ancho_asignado_cm:   datos.ancho_asignado_cm,
    facings_horizontal:  datos.facings_horizontal,
    cantidad_apilable:   datos.cantidad_apilable,
    unidades_por_facing: datos.unidades_por_facing,
    capacidad_maxima:    datos.capacidad_maxima,
    min_estetico:        datos.min_estetico ?? null,
    min_final:           datos.min_final ?? null,
    max_final:           datos.max_final ?? null,
    perfil_redondeo:     datos.perfil_redondeo ?? 'MRP',
    modo:                datos.modo ?? (datos.sku == null ? 'PENDIENTE' : 'PLANOGRAMA'),
    decision:            datos.decision ?? 'ACTIVO',
  });

  const creada = await posicionRepo.buscarPorId(id);
  return advertencia ? { ...creada, advertencia } : creada;
}

/**
 * Aplica un partial update de una posición (facings, capacidad, flags, observaciones, etc.).
 */
async function editarPosicion(posicionRepo, nivelRepo, gondolaRepo, versionRepo, id, cambios) {
  const posicion = await buscarPosicionOFallar(posicionRepo, id);
  await validarVersionDeLaPosicion(nivelRepo, gondolaRepo, versionRepo, posicion);

  validarDesborde(cambios.desborda_gondola, cambios.nota_desborde ?? posicion.nota_desborde);
  validarMinMax(cambios.min_final, cambios.max_final);

  await posicionRepo.actualizar(id, cambios);
  return posicionRepo.buscarPorId(id);
}

/**
 * Mueve una posición a otro nivel o a otro orden dentro del mismo nivel (CU-04-03).
 */
async function moverPosicion(posicionRepo, nivelRepo, gondolaRepo, versionRepo, id, nivelDestinoId, ordenDestino) {
  const posicion = await buscarPosicionOFallar(posicionRepo, id);
  const version  = await validarVersionDeLaPosicion(nivelRepo, gondolaRepo, versionRepo, posicion);

  const { nivel: nivelDestino, version: versionDestino } =
    await versionDelNivel(nivelRepo, gondolaRepo, versionRepo, nivelDestinoId);

  if (versionDestino.id !== version.id) {
    throw errorNotFound(`El nivel ${nivelDestinoId} no pertenece a la misma versión que la posición`);
  }

  if (nivelDestino.id === posicion.nivelId && ordenDestino === posicion.orden_horizontal) {
    return { id: posicion.id, nivel_id: posicion.nivelId, orden_horizontal: posicion.orden_horizontal };
  }

  await posicionRepo.mover({
    posicionId:     id,
    nivelOrigenId:  posicion.nivelId,
    ordenOrigen:    posicion.orden_horizontal,
    nivelDestinoId,
    ordenDestino,
  });

  const actualizada = await posicionRepo.buscarPorId(id);
  return { id: actualizada.id, nivel_id: actualizada.nivelId, orden_horizontal: actualizada.orden_horizontal };
}

/**
 * Duplica una posición (con sus accesorios) en el nivel/orden destino (CU-04-04/05).
 */
async function copiarPosicion(posicionRepo, nivelRepo, gondolaRepo, versionRepo, id, nivelDestinoId, ordenDestino) {
  const original = await buscarPosicionOFallar(posicionRepo, id);
  const { version } = await versionDelNivel(nivelRepo, gondolaRepo, versionRepo, original.nivelId);

  const { version: versionDestino } = await versionDelNivel(nivelRepo, gondolaRepo, versionRepo, nivelDestinoId);

  if (versionDestino.id !== version.id) {
    throw errorUnprocessable('El nivel destino pertenece a una versión diferente', { versionId: version.id });
  }
  validarVersionEditable(versionDestino.estado);

  const nuevaId = await posicionRepo.copiar(id, nivelDestinoId, ordenDestino);
  return posicionRepo.buscarPorId(nuevaId);
}

/** Elimina una posición y reajusta el orden del resto de posiciones del nivel (CU-04-06). */
async function eliminarPosicion(posicionRepo, nivelRepo, gondolaRepo, versionRepo, id) {
  const posicion = await buscarPosicionOFallar(posicionRepo, id);
  await validarVersionDeLaPosicion(nivelRepo, gondolaRepo, versionRepo, posicion);

  await posicionRepo.eliminarYReajustar(id);
}

/** Agrega un accesorio de montaje a una posición (CU-04-09). */
async function agregarAccesorio(posicionRepo, nivelRepo, gondolaRepo, versionRepo, posicionId, datos) {
  const posicion = await buscarPosicionOFallar(posicionRepo, posicionId);
  await validarVersionDeLaPosicion(nivelRepo, gondolaRepo, versionRepo, posicion);

  const accesorioExiste = await posicionRepo.accesorioExiste(datos.accesorio_id);
  if (!accesorioExiste) throw errorNotFound(`Accesorio ${datos.accesorio_id} no encontrado`);

  const id = await posicionRepo.agregarAccesorio(posicionId, datos);
  return posicionRepo.buscarAccesorioPorId(id);
}

/** Quita un accesorio de montaje de una posición (CU-04-11). */
async function eliminarAccesorio(posicionRepo, nivelRepo, gondolaRepo, versionRepo, posicionId, posicionAccesorioId) {
  const posicion = await buscarPosicionOFallar(posicionRepo, posicionId);
  await validarVersionDeLaPosicion(nivelRepo, gondolaRepo, versionRepo, posicion);

  const registro = await posicionRepo.buscarAccesorioPorId(posicionAccesorioId);
  if (!registro || registro.posicionId !== posicionId) {
    throw errorNotFound(`El accesorio ${posicionAccesorioId} no pertenece a la posición ${posicionId}`);
  }

  await posicionRepo.eliminarAccesorio(posicionAccesorioId);
}


/**
 * Asigna un SKU confirmado a una posición PENDIENTE.
 * Determina el modo: PLANOGRAMA si el SKU pertenece a una subcategoría de la versión,
 * CROSS si no pertenece.
 * Resetea confidence a 100 (confirmado por el usuario) y borra nombre_detectado.
 */
async function asignarSku(posicionRepo, nivelRepo, gondolaRepo, versionRepo, productoRepo, id, datos) {
  const posicion = await buscarPosicionOFallar(posicionRepo, id);
  await validarVersionDeLaPosicion(nivelRepo, gondolaRepo, versionRepo, posicion);

  const productoExiste = await productoRepo.asegurarExistencia(datos.sku);
  if (!productoExiste) {
    throw errorBadRequest(`El SKU '${datos.sku}' no existe en el catálogo local ni en CATI`);
  }

  const producto = await productoRepo.buscarPorSku(datos.sku);
  const subcategoriasVersion = datos.subcategorias ?? [];
  const modo = subcategoriasVersion.length > 0 && subcategoriasVersion.includes(producto?.subcategoria)
    ? 'PLANOGRAMA'
    : 'CROSS';

  // El ancho asignado pudo haber quedado de una detección/estimación previa (o del valor por
  // defecto de una posición PENDIENTE) — se recalcula con el ancho real del producto recién
  // asignado para que el espacio dibujado no quede más angosto que el producto.
  const anchoAsignado = calcularAnchoAsignado(posicion.facings_horizontal, producto?.ancho_cm, posicion.ancho_asignado_cm);

  await posicionRepo.actualizarAsignacionSku(id, {
    sku:               datos.sku,
    modo,
    confidence:        CONFIDENCE_CONFIRMADO,
    nombre_detectado:  null,
    ancho_asignado_cm: anchoAsignado,
  });

  return posicionRepo.buscarPorId(id);
}

module.exports = {
  listarPosiciones,
  obtenerPosicion,
  listarAccesorios,
  buscarPorSku,
  agregarPosicion,
  editarPosicion,
  moverPosicion,
  copiarPosicion,
  eliminarPosicion,
  agregarAccesorio,
  eliminarAccesorio,
  asignarSku,
};
