/**
 * Tipos del dominio del Lienzo (vista de canvas del planograma, inspirada en el editor de
 * flujos de n8n: góndolas como "frames" que se arrastran libremente sobre un lienzo con
 * pan/zoom, niveles y posiciones dentro de cada una).
 *
 * Se mantienen deliberadamente más simples que los tipos "reales" que ya consume el Editor
 * (`types/posicion.ts`, `types/nivel.ts`, `types/gondola.ts`): el Lienzo todavía no habla con
 * el backend, así que este archivo solo modela los campos que la interacción de canvas
 * necesita. El día que el Lienzo se conecte a la API, este es el archivo que se alinea con
 * los tipos reales (o se reemplaza por ellos) — el resto del módulo (reducer, componentes)
 * no debería necesitar cambios más allá de eso.
 */
import type { ModoPosicion, DecisionPosicion } from '../../types/posicion';

// Se reexportan tal cual: son los mismos valores permitidos que ya usa el Editor real, no hay
// motivo para duplicarlos.
export type { ModoPosicion, DecisionPosicion };

/** Producto del catálogo, tal como lo necesita el Lienzo para dibujar una posición. */
export interface ProductoCatalogo {
  sku: string;
  nombre: string;
  marca: string;
  anchoCm: number;
  altoCm: number;
  /** Cantidad apilable por defecto al agregar el producto por primera vez. */
  apilableDefecto: number;
  /**
   * Foto real del producto (viene del catálogo conectado — VTEX/CATI). `null` cuando el
   * catálogo no tiene foto para ese SKU: se dibuja como ficha gris con el SKU, igual que
   * `FacingTile` en el Editor real cuando `imagen_url` es `null`.
   */
  imagenUrl: string | null;
  /**
   * Color de referencia para la ficha ilustrativa del catálogo de ejemplo (modo sin conectar).
   * Solo se usa cuando no hay `imagenUrl` — permite diferenciar productos de ejemplo a simple
   * vista sin necesitar fotos reales.
   */
  colorFoto: string | null;
}

/** Una posición (SKU colocado, o slot pendiente de asignar) dentro de un nivel. */
export interface PosicionLienzo {
  id: string;
  sku: string | null;
  /** Nombre sugerido por el agente de visión para una posición PENDIENTE, si lo hay. */
  nombreDetectado: string | null;
  /** Confianza (0-100) de la detección. `null` cuando no hubo ningún intento de detección. */
  confidence: number | null;
  modo: ModoPosicion;
  decision: DecisionPosicion;
  facings: number;
  apilable: number;
  anchoCm: number;
  altoCm: number;
  /** CU-04-08: aceptar que la posición desborda la góndola requiere `notaDesborde`. */
  desbordaGondola: boolean;
  notaDesborde: string;
}

/** Un nivel (charola/gancho) de una góndola, con sus posiciones ya ordenadas. */
export interface NivelLienzo {
  id: string;
  /** Orden físico de abajo hacia arriba: 1 = el nivel más cercano al piso. */
  orden: number;
  alturaDesdePisoCm: number;
  tipoAccesorio: string;
  notas: string | null;
  posiciones: PosicionLienzo[];
}

/** Una góndola dibujada como "frame" independiente sobre el lienzo. */
export interface GondolaLienzo {
  id: string;
  nombre: string;
  anchoCm: number;
  /** Posición del frame en coordenadas de "mundo" del lienzo (no de pantalla). */
  x: number;
  y: number;
  niveles: NivelLienzo[];
}

/** Resultado de `calcularCapacidadNivel` — mismo shape que la `Capacidad` del backend. */
export interface CapacidadNivel {
  ocupadoCm: number;
  disponibleCm: number;
  libreCm: number;
  sobreOcupado: boolean;
}

export type TemaLienzo = 'claro' | 'oscuro';
