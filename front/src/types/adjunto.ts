export type AdjuntoTipoMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

/** Fila de `GET /versiones/{id}/adjuntos` — ver Arquitectura/Contratos/13_adjuntos/. */
export interface Adjunto {
  id: number;
  versionId: number;
  nombreOriginal: string;
  tipoMime: AdjuntoTipoMime;
  tamanoBytes: number;
  blobContainer: string;
  blobPath: string;
  /** URL del blob sin SAS — el contenedor es privado, no sirve para descarga directa. Usar
   * `adjuntosService.urlDescarga(id)` para descargar. */
  blobUrl: string;
  subidoPor: string;
  createdAt: string;
}

export interface AgregarAdjuntoInput {
  nombre_original: string;
  tipo_mime: AdjuntoTipoMime;
  archivo_base64: string;
}
