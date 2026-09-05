import { catalogoService } from '../services/catalogo.service';
import type { ProductoCatalogo } from '../types/catalogo';
import type { ProductoCatalogoJCv2 } from '../types/extractorJCv2';

// Mismo techo de paginación que construirCatalogoVision.
const TAMANO_PAGINA = 50;

/** El planograma guarda subcategorías como "(id) nombre" — CATI filtra por id numérico. */
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

function formatearDimensiones(p: ProductoCatalogo): string | null {
  if (p.ancho_cm == null || p.alto_cm == null || p.profundidad_cm == null) return null;
  return `${p.ancho_cm}x${p.alto_cm}x${p.profundidad_cm} cm`;
}

function aProductoJCv2(p: ProductoCatalogo): ProductoCatalogoJCv2 {
  return {
    sku: p.sku,
    name: p.nombre,
    brand: p.marca,
    category: p.subcategoria,
    price: p.precio,
    dimensions: formatearDimensiones(p),
    imagen_url: p.imagen_url,
  };
}

/** Catálogo con imagen_url por SKU para el extractor JC V2. Más rápido que construirCatalogoVision
 * porque no pide ficha técnica por SKU — la imagen de referencia es lo que aporta el contexto
 * visual que en el otro extractor lo hacen las specs textuales. */
export async function construirCatalogoJCv2(subcategorias: string[]): Promise<ProductoCatalogoJCv2[]> {
  const lotesPorSubcategoria = await Promise.all(subcategorias.map(buscarTodosPorSubcategoria));
  const porSku = new Map<string, ProductoCatalogo>();
  for (const producto of lotesPorSubcategoria.flat()) {
    porSku.set(producto.sku, producto);
  }
  return [...porSku.values()].map(aProductoJCv2);
}
