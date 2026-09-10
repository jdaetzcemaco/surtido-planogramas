/**
 * catiClient.js
 * Cliente HTTP hacia CATI (catálogo y jerarquía). Adjunta Bearer + x-api-key en cada
 * llamada (ver tokenManager) y cachea en memoria las respuestas de jerarquía por 30 minutos,
 * ya que ese catálogo cambia raramente (ver contratos en Arquitectura/Contratos/11_jerarquia/).
 * Las búsquedas de catálogo de productos se cachean por 5 minutos por separado (ver
 * Arquitectura/Contratos/08_catalogo/).
 */

const env          = require('../../config/env');
const tokenManager = require('./tokenManager');

const CACHE_TTL_MS        = 30 * 60 * 1000;
const CACHE_TTL_BUSQUEDA_MS = 5 * 60 * 1000;
const cache        = new Map(); // clave → { valor, expiraEn }

function errorServicioNoDisponible(mensaje, { causa, catiStatus } = {}) {
  const err = new Error(mensaje);
  err.status = 503;
  err.code   = 'SERVICE_UNAVAILABLE';
  if (causa) err.details = causa.message;
  if (catiStatus !== undefined) err.catiStatus = catiStatus;
  return err;
}

function obtenerDeCache(clave) {
  const entrada = cache.get(clave);
  if (!entrada || Date.now() >= entrada.expiraEn) return undefined;
  return entrada.valor;
}

function guardarEnCache(clave, valor, ttlMs = CACHE_TTL_MS) {
  cache.set(clave, { valor, expiraEn: Date.now() + ttlMs });
}

function mapJerarquia(item) {
  return { id: item.id, name: item.name };
}

/**
 * GET autenticado contra CATI. Retorna `null` si CATI responde 404 (recurso no encontrado
 * dentro del catálogo, ej. área inexistente), y lanza 503 para cualquier otro error o si
 * no responde dentro de `timeoutMs` (ver regla de negocio en GET_productos_buscar.md).
 * @param {string} path
 * @param {Record<string, string>} [params]
 * @param {{ timeoutMs?: number }} [opciones]
 * @returns {Promise<any>}
 */
async function get(path, params = {}, { timeoutMs } = {}) {
  const token = await tokenManager.obtenerAccessToken();
  const query = new URLSearchParams(params).toString();
  const url   = `${env.cati.baseUrl}${path}${query ? `?${query}` : ''}`;

  const controller = timeoutMs ? new AbortController() : undefined;
  const timeout     = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-api-key':   env.cati.apiKey,
      },
      signal: controller?.signal,
    });
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo conectar con CATI', { causa: err });
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    throw errorServicioNoDisponible(`CATI respondió con status ${response.status} en ${path}`, {
      catiStatus: response.status,
    });
  }

  return response.json();
}

/**
 * Lista las áreas de la jerarquía comercial (cacheado 30 min).
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function obtenerAreas() {
  const cacheado = obtenerDeCache('areas');
  if (cacheado) return cacheado;

  const items = await get('/Jerarquia/Area');
  const areas = (items ?? []).map(mapJerarquia);

  guardarEnCache('areas', areas);
  return areas;
}

/**
 * Lista los departamentos de un área (cacheado 30 min por área).
 * @param {string} areaId
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function obtenerDepartamentos(areaId) {
  const clave    = `departamentos:${areaId}`;
  const cacheado = obtenerDeCache(clave);
  if (cacheado) return cacheado;

  const items = await get('/Jerarquia/Departamento', { area: areaId, profile: 'CEMACO' });
  const departamentos = (items ?? []).map(mapJerarquia);

  guardarEnCache(clave, departamentos);
  return departamentos;
}

/**
 * Lista las familias de un departamento (cacheado 30 min por departamento).
 * @param {string} departamentoId
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function obtenerFamilias(departamentoId) {
  const clave    = `familias:${departamentoId}`;
  const cacheado = obtenerDeCache(clave);
  if (cacheado) return cacheado;

  const items    = await get('/Jerarquia/Familia', { departamento: departamentoId, profile: 'CEMACO' });
  const familias = (items ?? []).map(mapJerarquia);

  guardarEnCache(clave, familias);
  return familias;
}

/**
 * Lista las categorías de una familia (cacheado 30 min por familia).
 * @param {string} familiaId
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function obtenerCategorias(familiaId) {
  const clave    = `categorias:${familiaId}`;
  const cacheado = obtenerDeCache(clave);
  if (cacheado) return cacheado;

  const items      = await get('/Jerarquia/Categoria', { familia: familiaId, profile: 'CEMACO' });
  const categorias = (items ?? []).map(mapJerarquia);

  guardarEnCache(clave, categorias);
  return categorias;
}

/**
 * Lista las subcategorías de una categoría (cacheado 30 min por categoría).
 * @param {string} categoriaId
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function obtenerSubcategorias(categoriaId) {
  const clave    = `subcategorias:${categoriaId}`;
  const cacheado = obtenerDeCache(clave);
  if (cacheado) return cacheado;

  const items         = await get('/Jerarquia/Subcategoria', { categoria: categoriaId, profile: 'CEMACO' });
  const subcategorias = (items ?? []).map(mapJerarquia);

  guardarEnCache(clave, subcategorias);
  return subcategorias;
}

// ─── Catálogo de productos (ver Arquitectura/Contratos/08_catalogo/) ──────────

const NOMBRES_ANCHO       = ['ancho', 'width'];
const NOMBRES_ALTO        = ['alto', 'height'];
const NOMBRES_PROFUNDIDAD = ['profundidad', 'fondo', 'depth'];
const NOMBRE_ESTADO       = 'estado';
const VALOR_ESTADO_ACTIVO = 'activo';

/**
 * Los atributos físicos (ancho/alto/profundidad) no vienen en `erpInformation` — CATI los
 * expone como pares nombre/valor dentro de `internalAttributes`, con nombres que varían por
 * producto. Se busca por coincidencia de nombre (case-insensitive) contra las variantes
 * conocidas — ver anotación "Anti-corruption Layer" en GET_productos_detalle.md.
 */
function buscarAtributoNumerico(internalAttributes, nombresPosibles) {
  if (!internalAttributes) return null;

  for (const atributo of Object.values(internalAttributes)) {
    if (!atributo?.name) continue;
    const nombre = atributo.name.toLowerCase();
    if (nombresPosibles.some((n) => nombre.includes(n))) {
      const valor = Number(atributo.value);
      return Number.isFinite(valor) ? valor : null;
    }
  }
  return null;
}

function estaActivo(internalAttributes) {
  if (!internalAttributes) return true; // sin el atributo no hay forma de excluirlo

  for (const atributo of Object.values(internalAttributes)) {
    if (atributo?.name?.toLowerCase() === NOMBRE_ESTADO) {
      return atributo.value?.toLowerCase() === VALOR_ESTADO_ACTIVO;
    }
  }
  return true;
}

function seleccionarImagenPrincipal(assets) {
  if (!assets || assets.length === 0) return null;
  const principal = assets.find((a) => a.destinoImagen === 'PRINCIPAL');
  return (principal ?? assets[0]).azurePath_XL ?? null;
}

/** Forma cruda de CATI GET /Product/{sku} — ver GET_productos_detalle.md. */
function mapProductoCatalogo(raw) {
  return {
    sku:             raw.id,
    nombre:          raw.name,
    marca:           raw.erpInformation?.marca ?? null,
    subcategoria:    raw.erpInformation?.subCategoria ?? null,
    ancho_cm:        buscarAtributoNumerico(raw.internalAttributes, NOMBRES_ANCHO),
    alto_cm:         buscarAtributoNumerico(raw.internalAttributes, NOMBRES_ALTO),
    profundidad_cm:  buscarAtributoNumerico(raw.internalAttributes, NOMBRES_PROFUNDIDAD),
    imagen_url:      seleccionarImagenPrincipal(raw.assets),
    precio:          raw.regularPrice ?? null,
    modelo:          null,
  };
}

/** Forma usada en el detalle — agrega jerarquía; ver GET_productos_detalle.md. */
function mapProductoDetalle(raw) {
  return {
    ...mapProductoCatalogo(raw),
    categoria_nivel1: raw.erpInformation?.area ?? null,
    categoria_nivel2: raw.erpInformation?.departamento ?? null,
  };
}

/**
 * Forma cruda de CATI GET /Product/search — filas planas, muy distintas al detalle (sin
 * `erpInformation`/`internalAttributes`/`assets`): no trae precio, dimensiones ni imagen, esos
 * solo se obtienen pidiendo el detalle de un SKU puntual (ver GET_productos_buscar.md).
 */
function mapProductoBusqueda(raw) {
  return {
    sku:            raw.sku,
    nombre:         raw.descripcion,
    marca:          raw.marca ?? null,
    subcategoria:   raw.desSubcategoria ?? null,
    ancho_cm:       null,
    alto_cm:        null,
    profundidad_cm: null,
    imagen_url:     null,
    precio:         null,
    modelo:         raw.modelo ?? null,
  };
}

/**
 * Busca productos del catálogo (proxy a CATI GET /Product/search, cacheado 5 min).
 * @param {{ q: string, subcategoria?: string, page: number, pageSize: number }} filtros
 * @returns {Promise<Array<object>>}
 */
async function buscarProductos({ q, subcategoria, page, pageSize }) {
  const clave    = `catalogo:buscar:${JSON.stringify({ q, subcategoria, page, pageSize })}`;
  const cacheado = obtenerDeCache(clave);
  if (cacheado) return cacheado;

  const paramsBase = {
    Profile:    'CEMACO',
    PageNumber: String(page),
    PageSize:   String(pageSize),
  };
  if (subcategoria) paramsBase.Subcategoria = subcategoria;

  let productos;
  if (q) {
    // CATI combina los filtros de /Product/search con AND, no OR: mandar el mismo texto en
    // Sku, Descripcion y Marca a la vez solo matchea productos donde las tres coincidan (casi
    // nunca — confirmado contra CATI real). Para cumplir "busca por SKU, nombre o marca" (ver
    // GET_productos_buscar.md) se hace un llamado por campo en paralelo y se combinan los
    // resultados sin duplicados (por sku).
    const [porSku, porDescripcion, porMarca] = await Promise.all([
      get('/Product/search', { ...paramsBase, Sku: q },         { timeoutMs: 5000 }),
      get('/Product/search', { ...paramsBase, Descripcion: q }, { timeoutMs: 5000 }),
      get('/Product/search', { ...paramsBase, Marca: q },       { timeoutMs: 5000 }),
    ]);

    const vistos = new Set();
    productos = [];
    for (const data of [porSku, porDescripcion, porMarca]) {
      for (const raw of data?.items ?? []) {
        if (!estaActivo(raw.internalAttributes) || vistos.has(raw.sku)) continue;
        vistos.add(raw.sku);
        productos.push(mapProductoBusqueda(raw));
      }
    }
    productos = productos.slice(0, pageSize);
  } else {
    // q es opcional cuando se navega por subcategoria (ver GET_productos_buscar.md, regla 5):
    // mandar Sku/Descripcion/Marca vacíos a CATI filtra a cero resultados en vez de no filtrar.
    const data = await get('/Product/search', paramsBase, { timeoutMs: 5000 });
    productos = (data?.items ?? [])
      .filter((raw) => estaActivo(raw.internalAttributes))
      .map(mapProductoBusqueda);
  }

  guardarEnCache(clave, productos, CACHE_TTL_BUSQUEDA_MS);
  return productos;
}

/**
 * Obtiene el detalle de un producto (proxy a CATI GET /Product/{sku}). Retorna `null` si
 * el SKU no existe en CATI — ver regla 4 de GET_productos_detalle.md. CATI responde 404 para
 * un SKU bien formado que no existe, pero 400 para un SKU que no puede interpretar (formato
 * inesperado) — ambos casos se tratan igual acá: no hay producto que devolver. Cualquier otro
 * error (503, timeout, etc.) sí se relanza, porque ahí no sabemos si el producto existe o no.
 * @param {string} sku
 * @param {{ timeoutMs?: number }} [opciones]
 * @returns {Promise<object|null>}
 */
async function obtenerProducto(sku, { timeoutMs = 5000 } = {}) {
  let raw;
  try {
    raw = await get(`/Product/${encodeURIComponent(sku)}`, { profile: 'CEMACO' }, { timeoutMs });
  } catch (err) {
    if (err.catiStatus === 400) return null;
    throw err;
  }
  return raw ? mapProductoDetalle(raw) : null;
}

// ─── Stock (ver Arquitectura/Contratos/08_catalogo/GET_productos_stock.md) ────

/** Pasa los campos tal cual vienen de CATI — son strings nullable de SAP, no se castean a
 * número para no romper formatos con separador de miles u otras convenciones de SAP. */
function mapInventarioSap(raw) {
  return {
    sku:            raw.sku ?? null,
    centroId:       raw.centroId ?? null,
    centro:         raw.centro ?? null,
    stock:          raw.stock ?? null,
    stockDaniado:   raw.stockDaniado ?? null,
    stockBloqueado: raw.stockBloqueado ?? null,
    stockAlterno:   raw.stockAlterno ?? null,
  };
}

/**
 * Obtiene el stock SAP de un producto por centro (proxy a CATI GET /Stock/sap/{sku}).
 * Sin cache — a diferencia de catálogo/jerarquía, el stock cambia constantemente y cachearlo
 * daría información desactualizada para una decisión de surtido. Retorna `[]` si CATI responde
 * 404 (sin inventario en SAP para ese SKU) — no es un error, es un estado válido.
 * @param {string} sku
 * @param {{ timeoutMs?: number }} [opciones]
 * @returns {Promise<Array<object>>}
 */
async function obtenerStockSap(sku, { timeoutMs = 5000 } = {}) {
  const items = await get(`/Stock/sap/${encodeURIComponent(sku)}`, { profile: 'CEMACO' }, { timeoutMs });
  return (items ?? []).map(mapInventarioSap);
}

// ─── Ficha técnica (ver Arquitectura/Contratos/08_catalogo/GET_productos_fichaTecnica.md) ─

/**
 * CATI devuelve la ficha técnica como un fragmento HTML de una tabla (`<tr><th>etiqueta</th>
 * <td>valor</td></tr>` por fila) dentro de `data`, no como JSON estructurado. Estas funciones
 * son la capa anti-corrupción: traducen ese HTML a pares { etiqueta, valor } de texto plano,
 * para que el frontend no tenga que hacer `dangerouslySetInnerHTML` sobre contenido externo.
 */
function decodificarEntidadesHtml(texto) {
  return texto
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function limpiarEtiquetaFichaTecnica(html) {
  return decodificarEntidadesHtml(html.replace(/<[^>]+>/g, '')).trim();
}

function limpiarValorFichaTecnica(html) {
  const texto = html
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/?(ul|ol)>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{2,}/g, '\n');
  return decodificarEntidadesHtml(texto).trim();
}

const FILA_FICHA_TECNICA_REGEX = /<tr>\s*<th>([\s\S]*?)<\/th>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/gi;

function mapFichaTecnica(raw) {
  const html = raw?.data;
  if (!html) return [];

  const filas = [];
  let coincidencia;
  while ((coincidencia = FILA_FICHA_TECNICA_REGEX.exec(html)) !== null) {
    filas.push({
      etiqueta: limpiarEtiquetaFichaTecnica(coincidencia[1]),
      valor:    limpiarValorFichaTecnica(coincidencia[2]),
    });
  }
  return filas;
}

/**
 * Obtiene la ficha técnica de un producto (proxy a CATI GET /Product/fichaTecnica/{sku}).
 * Sin cache — a diferencia de catálogo/jerarquía, no hay indicio de que este endpoint sea
 * costoso, y cachear ficha técnica junto con búsqueda complicaría la invalidación sin
 * beneficio claro. Retorna `[]` si CATI no tiene ficha técnica para ese SKU (responde 200 con
 * `data: ""`, no 404 — ver nota de implementación en el contrato).
 * @param {string} sku
 * @param {{ timeoutMs?: number }} [opciones]
 * @returns {Promise<Array<{ etiqueta: string, valor: string }>>}
 */
async function obtenerFichaTecnica(sku, { timeoutMs = 5000 } = {}) {
  const raw = await get(`/Product/fichaTecnica/${encodeURIComponent(sku)}`, {}, { timeoutMs });
  return mapFichaTecnica(raw);
}

module.exports = {
  get,
  obtenerAreas,
  obtenerDepartamentos,
  obtenerFamilias,
  obtenerCategorias,
  obtenerSubcategorias,
  buscarProductos,
  obtenerProducto,
  obtenerStockSap,
  obtenerFichaTecnica,
};
