/** Lee un archivo tal cual, sin recodificar, y lo devuelve en base64 (sin el prefijo
 * `data:...;base64,`). A diferencia de `redimensionarImagenABase64`, no pasa por un <canvas> —
 * sirve para cualquier tipo de archivo, incluidos PDFs, que un canvas no puede procesar. */
export function archivoABase64(archivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = reader.result as string;
      resolve(resultado.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.readAsDataURL(archivo);
  });
}
