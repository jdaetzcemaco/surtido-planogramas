import { httpClient } from './httpClient';
import { redimensionarImagenABase64 } from '../utils/imagenRedimensionar';
import type { ResultadoDeteccionFacings, ResultadoExtraccionFacings } from '../types/extractorFacings';

const MARGEN_REFERENCIA = 4;
const RADIO_REFERENCIA_PORCENTAJE = 1.2;

// Puntos fijos en las 4 esquinas, inset un margen constante hacia el centro. Se queman de verdad
// en los píxeles de la imagen que recibe el modelo (ver `dibujarPuntosReferencia`) — no son solo
// una capa cosmética del front — para que el modelo tenga referencias concretas de escala y
// posición al estimar las coordenadas de cada facing.
const PUNTOS_REFERENCIA = [
  { x: MARGEN_REFERENCIA, y: MARGEN_REFERENCIA },
  { x: 100 - MARGEN_REFERENCIA, y: MARGEN_REFERENCIA },
  { x: MARGEN_REFERENCIA, y: 100 - MARGEN_REFERENCIA },
  { x: 100 - MARGEN_REFERENCIA, y: 100 - MARGEN_REFERENCIA },
];

function dibujarPuntosReferencia(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const radio = Math.max(6, Math.min(canvas.width, canvas.height) * (RADIO_REFERENCIA_PORCENTAJE / 100));
  for (const p of PUNTOS_REFERENCIA) {
    const cx = (p.x / 100) * canvas.width;
    const cy = (p.y / 100) * canvas.height;
    ctx.beginPath();
    ctx.arc(cx, cy, radio, 0, Math.PI * 2);
    ctx.fillStyle = '#101e8e'; // --cemaco-indigo
    ctx.fill();
    ctx.lineWidth = Math.max(1, radio * 0.25);
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
}

export const extractorFacingsService = {
  async analizar(imagenUrl: string): Promise<ResultadoDeteccionFacings> {
    const { base64, mimeType } = await redimensionarImagenABase64(imagenUrl, 1600, 0.85, dibujarPuntosReferencia);
    const resultado = await httpClient.post<ResultadoExtraccionFacings>('/agente-extractor/facings', {
      imagen_base64: base64,
      mime_type: mimeType,
    });
    return { ...resultado, puntosReferencia: PUNTOS_REFERENCIA };
  },
};
