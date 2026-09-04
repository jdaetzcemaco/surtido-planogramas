import { useRef, useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { EditorPuntosLienzo } from '../../lienzo/EditorPuntosLienzo/EditorPuntosLienzo';
import { VistaPreviaLienzo } from '../../lienzo/VistaPreviaLienzo/VistaPreviaLienzo';
import { useToast } from '../../../../context/ToastContext';
import { mensajeDeError } from '../../../../utils/errors';
import { aplanarImagen, esquinasPorDefecto, type EsquinasLienzo, type IntermediosLienzo } from '../../../../utils/lienzoWarp';
import './ExtractorLienzoModal.css';

interface ExtractorLienzoModalProps {
  onClose: () => void;
}

const INTERMEDIOS_VACIOS: IntermediosLienzo = { top: [], right: [], bottom: [], left: [] };

export function ExtractorLienzoModal({ onClose }: ExtractorLienzoModalProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [dimensiones, setDimensiones] = useState<{ ancho: number; alto: number } | null>(null);
  const [esquinas, setEsquinas] = useState<EsquinasLienzo | null>(null);
  const [intermedios, setIntermedios] = useState<IntermediosLienzo>(INTERMEDIOS_VACIOS);
  const [aplanando, setAplanando] = useState(false);
  const [resultadoUrl, setResultadoUrl] = useState<string | null>(null);
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

  if (resultadoUrl) {
    return <VistaPreviaLienzo url={resultadoUrl} onCerrar={() => setResultadoUrl(null)} />;
  }

  return (
    <Modal
      titulo="Lienzo: corregir perspectiva"
      onClose={onClose}
      ancho="xl"
      footer={
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
      }
    >
      <div className="extractor-lienzo-modal">
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
      </div>
    </Modal>
  );
}
