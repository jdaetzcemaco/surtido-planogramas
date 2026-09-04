import { N8N_VISION_WEBHOOK_URL } from '../config/env';
import type { ResultadoExtraccionVision, SolicitudExtraccionVision } from '../types/extractorVisionCatalogo';

export const extractorVisionCatalogoService = {
  async analizar(solicitud: SolicitudExtraccionVision): Promise<ResultadoExtraccionVision> {
    if (!N8N_VISION_WEBHOOK_URL) {
      throw new Error('Falta configurar VITE_N8N_VISION_WEBHOOK_URL en el .env del front');
    }

    const respuesta = await fetch(N8N_VISION_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(solicitud),
    }).catch(() => {
      throw new Error('No se pudo conectar con el flujo de extracción visual (¿está activo el test en n8n?)');
    });

    if (!respuesta.ok) {
      throw new Error(`El flujo de extracción visual respondió con error (${respuesta.status})`);
    }

    return respuesta.json();
  },
};
