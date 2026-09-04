export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

// Webhook de prueba del flujo n8n de extracción visual (Claude Vision) — mientras dure la etapa
// de test, apunta al webhook-test de n8n y solo responde con el editor de n8n en modo "Execute
// workflow"/listen. Host externo, por eso no pasa por httpClient/API_BASE_URL.
export const N8N_VISION_WEBHOOK_URL: string | undefined = import.meta.env.VITE_N8N_VISION_WEBHOOK_URL;
