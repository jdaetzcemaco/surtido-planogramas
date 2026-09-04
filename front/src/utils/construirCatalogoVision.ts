import { catalogoService } from '../services/catalogo.service';
import type { ProductoCatalogo } from '../types/catalogo';
import type { ProductoCatalogoVision } from '../types/extractorVisionCatalogo';

// Techo de paginación del backend para /catalog/productos/buscar (ver Joi en catalogo.controller.js).
const TAMANO_PAGINA = 50;
// Ficha técnica es 1 request HTTP por sku contra el proxy CATI — se pide en lotes para no
// disparar cientos de requests en paralelo contra un sistema externo que puede estar lento.
const CONCURRENCIA_FICHA_TECNICA = 8;

/** El planograma guarda cada subcategoría como "(id) nombre" (ver ExploradorSubcategorias) para
 * que el id quede accesible, pero CATI solo filtra por id (GET_productos_buscar.md: "id obtenido
 * de GET /jerarquia/subcategorias") — hay que pelarlo antes de consultar el catálogo. */
function extraerIdSubcategoria(subcategoria: string): string {
  return subcategoria.match(/^\(([^)]+)\)/)?.[1] ?? subcategoria;
}

async function buscarTodosPorSubcategoria(subcategoria: string): Promise<ProductoCatalogo[]> {
  const id = extraerIdSubcategoria(subcategoria);
  const productos: ProductoCatalogo[] = [];
  let pagina = 1;
  for (;;) {
    const lote = await catalogoService.buscarProductos('', { subcategoria: id, page: pagina, pageSize: TAMANO_PAGINA });
    productos.push(...lote);
    if (lote.length < TAMANO_PAGINA) break;
    pagina += 1;
  }
  return productos;
}

function formatearDimensiones(producto: ProductoCatalogo): string | null {
  if (producto.ancho_cm == null || producto.alto_cm == null || producto.profundidad_cm == null) return null;
  return `${producto.ancho_cm}x${producto.alto_cm}x${producto.profundidad_cm} cm`;
}

async function formatearSpecs(producto: ProductoCatalogo): Promise<string | null> {
  const campos: string[] = [];
  if (producto.modelo) campos.push(`Modelo: ${producto.modelo}`);
  try {
    const fichaTecnica = await catalogoService.obtenerFichaTecnica(producto.sku);
    campos.push(...fichaTecnica.map((campo) => `${campo.etiqueta}: ${campo.valor}`));
  } catch {
    // CATI puede no tener ficha técnica para este sku, o estar caído — se sigue sin ella.
  }
  return campos.length > 0 ? campos.join('; ') : null;
}

async function aProductoVision(producto: ProductoCatalogo): Promise<ProductoCatalogoVision> {
  return {
    sku: producto.sku,
    name: producto.nombre,
    brand: producto.marca,
    category: producto.subcategoria,
    price: producto.precio,
    dimensions: formatearDimensiones(producto),
    specs: await formatearSpecs(producto),
  };
}

async function enLotes<T, R>(items: T[], tamanoLote: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = [];
  for (let i = 0; i < items.length; i += tamanoLote) {
    const lote = items.slice(i, i + tamanoLote);
    resultados.push(...(await Promise.all(lote.map(fn))));
  }
  return resultados;
}

/** Junta el catálogo completo (sin duplicados) de todas las subcategorías asignadas al
 * planograma, con ficha técnica y dimensiones incluidas, listo para mandar al agente de visión. */
export async function construirCatalogoVision(subcategorias: string[]): Promise<ProductoCatalogoVision[]> {
  const lotesPorSubcategoria = await Promise.all(subcategorias.map(buscarTodosPorSubcategoria));
  const porSku = new Map<string, ProductoCatalogo>();
  for (const producto of lotesPorSubcategoria.flat()) {
    porSku.set(producto.sku, producto);
  }
  return enLotes([...porSku.values()], CONCURRENCIA_FICHA_TECNICA, aProductoVision);
}
