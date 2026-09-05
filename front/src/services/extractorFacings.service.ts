import { httpClient } from './httpClient';
import type { ResultadoExtraccionFacings } from '../types/extractorFacings';

export const extractorFacingsService = {
  analizar: (datos: { imagen_base64: string; mime_type: string }) =>
    httpClient.post<ResultadoExtraccionFacings>('/agente-extractor/facings', datos),
};
