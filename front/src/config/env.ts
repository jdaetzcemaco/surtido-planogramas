export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

// Webhook del flujo n8n de extracción visual (Claude Vision). JC V2 también lo reutiliza
// mientras no exista un flujo propio — la diferencia está en el payload, no en el endpoint.
export const N8N_VISION_WEBHOOK_URL: string | undefined = import.meta.env.VITE_N8N_VISION_WEBHOOK_URL;
