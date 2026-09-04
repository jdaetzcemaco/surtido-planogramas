// Los nombres de campo acá son en inglés a propósito: reflejan tal cual el contrato del webhook
// de n8n ("Construir request Claude" / "Formatear respuesta"), no el dominio en español del resto
// de la app — es la frontera con un sistema externo, igual que `types/catalogo.ts` refleja CATI.

export interface FotoMuebleVision {
  id: string;
  label: string;
  dataUrl: string;
}

export interface FixtureVision {
  name: string;
  width: number;
  levels: number;
  depth: number;
}

export interface ProductoCatalogoVision {
  sku: string;
  name: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  dimensions: string | null;
  specs: string | null;
}

export interface SolicitudExtraccionVision {
  store: string;
  category: string;
  fixture: FixtureVision;
  photos: FotoMuebleVision[];
  catalog: ProductoCatalogoVision[];
}

export interface AlternativaDetectadaVision {
  sku: string;
  name: string;
  confidence: number;
}

export interface ItemDetectadoVision {
  sku: string | null;
  detectedName: string;
  facings: number;
  confidence: number;
  moduleId: string;
  reason: string;
  alternatives: AlternativaDetectadaVision[];
}

export interface NivelDetectadoVision {
  name: string;
  confidence: number;
  items: ItemDetectadoVision[];
}

export interface ResultadoExtraccionVision {
  fixtureSummary: string;
  rows: NivelDetectadoVision[];
  error?: string;
}
