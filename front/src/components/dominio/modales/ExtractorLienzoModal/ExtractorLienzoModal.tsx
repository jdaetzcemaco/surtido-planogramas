import { useRef, useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { EditorPuntosLienzo } from '../../lienzo/EditorPuntosLienzo/EditorPuntosLienzo';
import { VistaPreviaLienzo } from '../../lienzo/VistaPreviaLienzo/VistaPreviaLienzo';
import { RevisionExtraccionJCv2 } from '../ExtractorJCv2Modal/RevisionExtraccionJCv2';
import { useToast } from '../../../../context/ToastContext';
import { mensajeDeError } from '../../../../utils/errors';
import { extractorJCv2Service } from '../../../../services/extractorJCv2.service';
import { construirCatalogoJCv2 } from '../../../../utils/construirCatalogoJCv2';
import { redimensionarImagenABase64 } from '../../../../utils/imagenRedimensionar';
import { aplanarImagen, esquinasPorDefecto, type EsquinasLienzo, type IntermediosLienzo } from '../../../../utils/lienzoWarp';
import type { GondolaListItem } from '../../../../types/gondola';
import type { ResultadoExtraccionJCv2 } from '../../../../types/extractorJCv2';
import './ExtractorLienzoModal.css';

interface ExtractorLienzoModalProps {
  subcategorias: string[];
  /** Todas las góndolas de la versión — para ofrecer el selector de destino tras la detección. */
  gondolas: GondolaListItem[];
  versionId: number;
  /** Góndola activa — usada como referencia de fixture para el análisis IA. */
  gondola: GondolaListItem;
  categoria: string;
  onClose: () => void;
  onAceptar: () => void;
}

const INTERMEDIOS_VACIOS: IntermediosLienzo = { top: [], right: [], bottom: [], left: [] };

export function ExtractorLienzoModal({
  subcategorias,
  gondolas,
  versionId,
  gondola,
  categoria,
  onClose,
  onAceptar,
}: ExtractorLienzoModalProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [dimensiones, setDimensiones] = useState<{ ancho: number; alto: number } | null>(null);
  const [esquinas, setEsquinas] = useState<EsquinasLienzo | null>(null);
  const [intermedios, setIntermedios] = useState<IntermediosLienzo>(INTERMEDIOS_VACIOS);
  const [aplanando, setAplanando] = useState(false);
  const [resultadoUrl, setResultadoUrl] = useState<string | null>(null);
  const [detectando, setDetectando] = useState(false);
  const [faseTexto, setFaseTexto] = useState('');
  const [resultado, setResultado] = useState<ResultadoExtraccionJCv2 | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const { mostrarToast } = useToast();

  function onSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0] ?? null;
    if (!archivo) return;
    setDimensiones(null);
    setEsquinas(null);
    setIntermedios(INTERMEDIOS_VACIOS);
    setResultadoUrl(null);
    setImgUrl(URL.createObjectURL(archivo));
  }

  function onImagenCargada() {
    const img = imgRef.current;
    if (!img) return;
    const ancho = img.naturalWidth;
    const alto = img.naturalHeight;
    setDimensiones({ ancho, alto });
    setEsquinas((actual) => actual ?? esquinasPorDefecto(ancho, alto));
  }

  function reiniciarPuntos() {
    if (!dimensiones) return;
    setEsquinas(esquinasPorDefecto(dimensiones.ancho, dimensiones.alto));
    setIntermedios(INTERMEDIOS_VACIOS);
  }

  async function onAplanar() {
    if (!imgRef.current || !esquinas || aplanando) return;
    setAplanando(true);
    // Cede el hilo un tick para que "Aplanando…" se pinte antes del trabajo síncrono del warp.
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const canvas = aplanarImagen(imgRef.current, esquinas, intermedios);
      setResultadoUrl(canvas.toDataURL('image/png'));
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo aplanar la imagen'), 'error');
    } finally {
      setAplanando(false);
    }
  }

  function volverAEditar() {
    setResultadoUrl(null);
  }

  function descargar() {
    if (!resultadoUrl) return;
    const enlace = document.createElement('a');
    enlace.href = resultadoUrl;
    enlace.download = 'lienzo-corregido.png';
    enlace.click();
  }

  async function detectarProductos() {
    if (!resultadoUrl || detectando) return;
    if (subcategorias.length === 0) {
      mostrarToast(
        'Este planograma no tiene subcategorías asignadas — no hay catálogo contra qué comparar la foto.',
        'error',
      );
      return;
    }

    setDetectando(true);
    try {
      setFaseTexto(`Recolectando catálogo con imágenes de ${subcategorias.length} subcategoría(s)…`);
      const catalog = await construirCatalogoJCv2(subcategorias);
      if (catalog.length === 0) {
        mostrarToast(
          'No se encontraron productos en el catálogo para las subcategorías de este planograma.',
          'error',
        );
        return;
      }

      setFaseTexto('Analizando la foto aplanada con el agente JC V2…');
      const { base64, mimeType } = await redimensionarImagenABase64(resultadoUrl);
      const photos = [{ id: 'lienzo', label: 'Lienzo', dataUrl: `data:${mimeType};base64,${base64}` }];

      const respuesta = await extractorJCv2Service.analizar({
        store: 'Cemaco',
        category: categoria,
        fixture: {
          name: gondola.nombre,
          width: gondola.ancho_cm,
          levels: gondola.totalNiveles,
          depth: gondola.profundidad_cm,
        },
        photos,
        catalog,
      });

      if (respuesta.error) {
        mostrarToast(respuesta.error, 'error');
        return;
      }
      setResultado(respuesta);
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo completar la extracción JC V2'), 'error');
    } finally {
      setDetectando(false);
      setFaseTexto('');
    }
  }

  if (resultado) {
    return (
      <RevisionExtraccionJCv2
        resultado={resultado}
        gondolas={gondolas}
        versionId={versionId}
        gondolaReferencia={gondola}
        onClose={onClose}
        onAceptar={onAceptar}
      />
    );
  }

  return (
    <Modal
      titulo="Lienzo: corregir perspectiva"
      onClose={onClose}
      ancho="xl"
      claseModal="extractor-lienzo-modal-dialog"
      footer={
        resultadoUrl ? (
          <>
            <Button variante="outline" onClick={onClose} disabled={detectando}>
              Cerrar
            </Button>
            <Button variante="outline" onClick={volverAEditar} disabled={detectando}>
              Volver a editar
            </Button>
            <Button variante="outline" onClick={descargar} disabled={detectando}>
              Descargar
            </Button>
            <Button variante="primary" onClick={detectarProductos} disabled={detectando}>
              {detectando ? faseTexto || 'Detectando…' : 'Iniciar detección de productos'}
            </Button>
          </>
        ) : (
          <>
            <Button variante="outline" onClick={onClose} disabled={aplanando}>
              Cancelar
            </Button>
            {imgUrl && (
              <>
                <Button variante="outline" onClick={reiniciarPuntos} disabled={aplanando || !dimensiones}>
                  Reiniciar puntos
                </Button>
                <Button variante="primary" onClick={onAplanar} disabled={aplanando || !esquinas}>
                  {aplanando ? 'Aplanando…' : 'Aplanar imagen'}
                </Button>
              </>
            )}
          </>
        )
      }
    >
      <div className="extractor-lienzo-modal">
        {resultadoUrl ? (
          <VistaPreviaLienzo url={resultadoUrl} />
        ) : (
          <>
            <p className="extractor-lienzo-modal__ayuda">
              Subí una foto del mueble tomada en ángulo. Arrastrá las cuatro esquinas para delimitar la
              góndola — si el ángulo deja productos fuera de un lado, hacé clic en los "+" sobre ese
              lado para agregar nodos y arrastralos hasta abarcar el área completa (doble clic en un
              nodo para quitarlo). Al aplanar, la imagen queda recta y de frente.
            </p>

            <input type="file" accept="image/*" onChange={onSeleccionarArchivo} disabled={aplanando} />

            {imgUrl && (
              <EditorPuntosLienzo
                imgUrl={imgUrl}
                imgRef={imgRef}
                onImagenCargada={onImagenCargada}
                dimensiones={dimensiones}
                esquinas={esquinas}
                intermedios={intermedios}
                onCambiar={(nuevasEsquinas, nuevosIntermedios) => {
                  setEsquinas(nuevasEsquinas);
                  setIntermedios(nuevosIntermedios);
                }}
              />
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
