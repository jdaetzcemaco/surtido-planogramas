// Tipos para el extractor JC V2 — variante del extractor visual que envía imágenes de referencia
// del catálogo junto con las fotos del mueble, para una comparación visual directa producto a
// producto. El formato de salida es idéntico al de ExtractorVisionCatalogo.

import type { FixtureVision, FotoMuebleVision, ResultadoExtraccionVision } from './extractorVisionCatalogo';

export interface ProductoCatalogoJCv2 {
  sku: string;
  name: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  dimensions: string | null;
  imagen_url: string | null;
}

export interface SolicitudExtraccionJCv2 {
  store: string;
  category: string;
  fixture: FixtureVision;
  photos: FotoMuebleVision[];
  catalog: ProductoCatalogoJCv2[];
}

// La respuesta reutiliza el mismo esquema que ExtractorVisionCatalogo: la diferencia está en
// el proceso de reconocimiento (más preciso al tener imágenes de referencia), no en la salida.
export type ResultadoExtraccionJCv2 = ResultadoExtraccionVision;

// Re-exports convenientes — el modal JC V2 usa estos nombres en vez de los genéricos de Vision
export type { ItemDetectadoVision as ItemExtraccionJCv2 } from './extractorVisionCatalogo';
export type { AlternativaDetectadaVision as AlternativaExtraccionJCv2 } from './extractorVisionCatalogo';
