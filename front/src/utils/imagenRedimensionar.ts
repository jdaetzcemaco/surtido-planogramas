/** Redimensiona una imagen (ej. foto de celular, varios MB, o un data URL ya generado en canvas)
 * a un lado máximo de `maxDimension` px y la recodifica a JPEG antes de mandarla en base64 al
 * backend — evita pegarle al agente de visión con archivos enormes y mantiene el body de la
 * request liviano. `dibujarEncima`, si se pasa, corre después de dibujar la imagen redimensionada
 * y antes de codificarla — sirve para quemarle marcas de referencia a la imagen que ve el modelo
 * (ver `extractorFacings.service.ts`), no solo dibujarlas encima en el front. */
export function redimensionarImagenABase64(
  origen: File | string,
  maxDimension = 2000,
  calidad = 0.85,
  dibujarEncima?: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const esArchivo = typeof origen !== 'string';
    const url = esArchivo ? URL.createObjectURL(origen) : origen;
    const img = new Image();

    img.onload = () => {
      if (esArchivo) URL.revokeObjectURL(url);

      const escala = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const ancho = Math.round(img.width * escala);
      const alto = Math.round(img.height * escala);

      const canvas = document.createElement('canvas');
      canvas.width = ancho;
      canvas.height = alto;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo preparar la imagen para enviarla.'));
        return;
      }
      ctx.drawImage(img, 0, 0, ancho, alto);
      dibujarEncima?.(ctx, canvas);

      const dataUrl = canvas.toDataURL('image/jpeg', calidad);
      const base64 = dataUrl.split(',')[1] ?? '';
      resolve({ base64, mimeType: 'image/jpeg' });
    };

    img.onerror = () => {
      if (esArchivo) URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen seleccionada.'));
    };

    img.src = url;
  });
}
