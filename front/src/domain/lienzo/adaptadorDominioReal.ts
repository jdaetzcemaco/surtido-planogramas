/**
 * Adaptador (arquitectura hexagonal) entre el dominio real de la aplicación — los tipos que ya
 * usa el Editor (`types/gondola.ts`, `types/nivel.ts`, `types/posicion.ts`, `types/catalogo.ts`)
 * — y el modelo de vista propio del Lienzo (`lienzo.types.ts`).
 *
 * El Lienzo dibuja góndolas como "frames" libres en un canvas con pan/zoom; ese modelo de
 * vista es deliberadamente más simple que el real (por ejemplo, no existe un campo de alto
 * físico por posición en el dominio real — solo en el catálogo, y no siempre). Este archivo es
 * el único lugar que conoce ambos lados: traduce la respuesta real de la API al modelo de
 * vista que ya consumen `GondolaFrameLienzo`/`NivelFilaLienzo`/`PosicionLienzo`, para que esos
 * componentes (construidos primero contra datos de ejemplo) no necesiten cambios al conectarse
 * al backend.
 */
import type { GondolaListItem } from '../../types/gondola';
import type { Nivel } from '../../types/nivel';
import type { Capacidad, PosicionConProducto, PosicionesDeNivel } from '../../types/posicion';
import type { ProductoCatalogo as ProductoCatalogoReal, ProductoDetalle } from '../../types/catalogo';
import type { CapacidadNivel, GondolaLienzo, NivelLienzo, PosicionLienzo, ProductoCatalogo } from './lienzo.types';

/**
 * El dominio real no registra el alto físico de una posición ya colocada (`PosicionConProducto`
 * solo trae `ancho_cm` del producto) — este valor fijo se usa únicamente para dibujarla en el
 * lienzo (alto de la ficha, regla vertical). No se guarda ni se manda al backend en ningún lado.
 */
export const ALTO_VISUAL_POR_DEFECTO_CM = 20;

export function adaptarPosicion(p: PosicionConProducto): PosicionLienzo {
  return {
    id: String(p.id),
    sku: p.sku,
    nombreDetectado: p.nombre_detectado,
    confidence: p.confidence,
    modo: p.modo,
    decision: p.decision,
    facings: p.facings_horizontal,
    apilable: p.cantidad_apilable,
    anchoCm: p.ancho_asignado_cm,
    altoCm: ALTO_VISUAL_POR_DEFECTO_CM,
    desbordaGondola: p.desborda_gondola,
    notaDesborde: p.nota_desborde ?? '',
  };
}

/** Ficha de producto lista para `PosicionLienzo`, a partir de lo que ya trae embebido una posición. */
export function adaptarProductoDePosicion(p: PosicionConProducto): ProductoCatalogo | null {
  if (!p.sku) return null;
  return {
    sku: p.sku,
    nombre: p.producto?.nombre ?? p.sku,
    marca: '',
    anchoCm: p.producto?.ancho_cm ?? p.ancho_asignado_cm,
    altoCm: ALTO_VISUAL_POR_DEFECTO_CM,
    apilableDefecto: p.cantidad_apilable,
    imagenUrl: p.producto?.imagen_url ?? null,
    colorFoto: null,
  };
}

/** Ficha de producto lista para el catálogo lateral (resultados de búsqueda), a partir de un producto real del catálogo. */
export function adaptarProductoCatalogo(p: ProductoCatalogoReal | ProductoDetalle): ProductoCatalogo {
  return {
    sku: p.sku,
    nombre: p.nombre,
    marca: p.marca ?? '',
    anchoCm: p.ancho_cm ?? 10,
    altoCm: p.alto_cm ?? ALTO_VISUAL_POR_DEFECTO_CM,
    apilableDefecto: 1,
    imagenUrl: p.imagen_url,
    colorFoto: null,
  };
}

export function adaptarNivel(nivel: Nivel, posicionesDelNivel: PosicionConProducto[]): NivelLienzo {
  return {
    id: String(nivel.id),
    orden: nivel.orden,
    alturaDesdePisoCm: nivel.altura_desde_piso_cm,
    tipoAccesorio: nivel.tipo_accesorio,
    notas: nivel.notas,
    posiciones: posicionesDelNivel.map(adaptarPosicion),
  };
}

/** `xy` es puramente la posición del frame dentro del lienzo (coordenadas de canvas) — un concepto de UI local que el dominio real no modela ni persiste. */
export function adaptarGondola(
  gondola: GondolaListItem,
  nivelesDeLaGondola: Nivel[],
  posicionesPorNivel: Record<number, PosicionesDeNivel>,
  xy: { x: number; y: number },
): GondolaLienzo {
  const niveles = [...nivelesDeLaGondola]
    .sort((a, b) => a.orden - b.orden)
    .map((nivel) => adaptarNivel(nivel, posicionesPorNivel[nivel.id]?.posiciones ?? []));

  return {
    id: String(gondola.id),
    nombre: gondola.nombre,
    anchoCm: gondola.ancho_cm,
    x: xy.x,
    y: xy.y,
    niveles,
  };
}

export function adaptarCapacidad(c: Capacidad): CapacidadNivel {
  return {
    ocupadoCm: c.ancho_ocupado_cm,
    disponibleCm: c.ancho_disponible_cm,
    libreCm: c.ancho_libre_cm,
    sobreOcupado: c.ancho_libre_cm < 0,
  };
}
