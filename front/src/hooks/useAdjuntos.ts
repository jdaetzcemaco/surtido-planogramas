import { useCallback, useEffect, useState } from 'react';
import { adjuntosService } from '../services/adjuntos.service';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import { archivoABase64 } from '../utils/archivoABase64';
import type { Adjunto, AdjuntoTipoMime } from '../types/adjunto';

// Misma lista blanca y tope de tamaño que el backend (ver adjunto.entity.js) — validar acá evita
// un viaje al servidor para un error que ya se puede detectar en el navegador.
const TIPOS_PERMITIDOS: AdjuntoTipoMime[] = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

function validarArchivo(archivo: File): string | null {
  if (!TIPOS_PERMITIDOS.includes(archivo.type as AdjuntoTipoMime)) {
    return 'Tipo de archivo no permitido. Se aceptan imágenes (JPG, PNG, WEBP) o PDF.';
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return 'El archivo excede el tamaño máximo permitido (5MB).';
  }
  return null;
}

export function useAdjuntosDeVersion(versionId: number) {
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setAdjuntos(await adjuntosService.listarPorVersion(versionId));
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudieron cargar los adjuntos'), 'error');
    } finally {
      setCargando(false);
    }
  }, [versionId, mostrarToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function agregar(archivo: File): Promise<boolean> {
    const error = validarArchivo(archivo);
    if (error) {
      mostrarToast(error, 'error');
      return false;
    }
    setEnviando(true);
    try {
      const archivo_base64 = await archivoABase64(archivo);
      const nuevo = await adjuntosService.agregar(versionId, {
        nombre_original: archivo.name,
        tipo_mime: archivo.type as AdjuntoTipoMime,
        archivo_base64,
      });
      setAdjuntos((actual) => [nuevo, ...actual]);
      mostrarToast('Adjunto subido', 'success');
      return true;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo subir el adjunto'), 'error');
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function reemplazar(id: number, archivo: File): Promise<boolean> {
    const error = validarArchivo(archivo);
    if (error) {
      mostrarToast(error, 'error');
      return false;
    }
    setEnviando(true);
    try {
      const archivo_base64 = await archivoABase64(archivo);
      const actualizado = await adjuntosService.reemplazar(id, {
        nombre_original: archivo.name,
        tipo_mime: archivo.type as AdjuntoTipoMime,
        archivo_base64,
      });
      setAdjuntos((actual) => actual.map((a) => (a.id === id ? actualizado : a)));
      mostrarToast('Adjunto reemplazado', 'success');
      return true;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo reemplazar el adjunto'), 'error');
      return false;
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(id: number): Promise<boolean> {
    setEnviando(true);
    try {
      await adjuntosService.eliminar(id);
      setAdjuntos((actual) => actual.filter((a) => a.id !== id));
      mostrarToast('Adjunto eliminado', 'success');
      return true;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo eliminar el adjunto'), 'error');
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return { adjuntos, cargando, enviando, recargar: cargar, agregar, reemplazar, eliminar };
}
