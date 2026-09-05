// JC V2 usa el mismo webhook n8n que ExtractorVisionCatalogo — la diferencia está en el payload
// que construye el front (catalog incluye imagen_url en vez de specs de ficha técnica).
// Cuando el nodo "Construir request Claude" de n8n esté corregido, ambos flujos se beneficiarán.
import { N8N_VISION_WEBHOOK_URL } from '../config/env';
import type { ResultadoExtraccionJCv2, SolicitudExtraccionJCv2 } from '../types/extractorJCv2';

export const extractorJCv2Service = {
  async analizar(solicitud: SolicitudExtraccionJCv2): Promise<ResultadoExtraccionJCv2> {
    if (!N8N_VISION_WEBHOOK_URL) {
      throw new Error('Falta configurar VITE_N8N_VISION_WEBHOOK_URL en el .env del front');
    }

    const respuesta = await fetch(N8N_VISION_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(solicitud),
    }).catch(() => {
      throw new Error('No se pudo conectar con el flujo de extracción (¿está activo el webhook en n8n?)');
    });

    if (!respuesta.ok) {
      throw new Error(`El flujo de extracción respondió con error (${respuesta.status})`);
    }

    return respuesta.json();
  },
};
