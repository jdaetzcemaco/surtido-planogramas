import { useState } from 'react';
import { AgenteExtractorChat } from '../AgenteExtractorChat/AgenteExtractorChat';
import { ResumenBorradorModal } from '../../modales/ResumenBorradorModal/ResumenBorradorModal';
import { ExtractorImagenNumeradaModal } from '../../modales/ExtractorImagenNumeradaModal/ExtractorImagenNumeradaModal';
import { SeleccionarMetodoExtraccionModal } from '../../modales/SeleccionarMetodoExtraccionModal/SeleccionarMetodoExtraccionModal';
import { ExtractorVisionCatalogoModal } from '../../modales/ExtractorVisionCatalogoModal/ExtractorVisionCatalogoModal';
import { useAgenteExtractor } from '../../../../hooks/useAgenteExtractor';
import { useNivelesDeVersion } from '../../../../hooks/useNiveles';
import { usePosicionesDeNiveles } from '../../../../hooks/usePosiciones';
import { useAccesorios } from '../../../../hooks/useAccesorios';
import { usePosicionFlotante } from '../../../../hooks/usePosicionFlotante';
import { construirContextoAgente } from '../../../../utils/agenteExtractorContexto';
import type { GondolaListItem } from '../../../../types/gondola';
import './AgenteExtractorBubble.css';

const ANCHO_BURBUJA = 88;
const ALTO_BURBUJA = 48;
const ANCHO_PANEL = 360;
const ALTO_PANEL = 520;

type MetodoExtraccion = 'ninguno' | 'elegir' | 'imagen-numerada' | 'vision-catalogo';

interface AgenteExtractorBubbleProps {
  puedeEscribir: boolean;
  versionId: number;
  /** Todas las góndolas de la versión — el agente opera sobre la versión completa, no solo la
   * góndola activa en pantalla. */
  gondolas: GondolaListItem[];
  /** Góndola visible en pantalla — es la que se usa como "fixture" para el extractor por fotos
   * (IA visual), ya que las fotos que suba el usuario son de ese mueble puntual. */
  gondolaActiva: GondolaListItem;
  categoria: string;
  subcategorias: string[];
  onConfirmado: () => void;
}

export function AgenteExtractorBubble({
  puedeEscribir,
  versionId,
  gondolas,
  gondolaActiva,
  categoria,
  subcategorias,
  onConfirmado,
}: AgenteExtractorBubbleProps) {
  const [abierto, setAbierto] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [metodoExtraccion, setMetodoExtraccion] = useState<MetodoExtraccion>('ninguno');

  // Carga perezosa: solo se pide el detalle de niveles/posiciones de toda la versión cuando el
  // chat está abierto, para no pegarle a la API de cada góndola en cada carga del editor.
  const { niveles, recargar: recargarNiveles } = useNivelesDeVersion(gondolas, abierto);
  const { porNivel: posicionesPorNivel, recargar: recargarPosiciones } = usePosicionesDeNiveles(niveles);
  const { accesorios } = useAccesorios();

  const contexto = construirContextoAgente(gondolas, niveles, posicionesPorNivel, accesorios, subcategorias);
  const agente = useAgenteExtractor(contexto);

  const { pos, iniciarArrastre, consumirArrastre, anclarEsquina } = usePosicionFlotante(ANCHO_BURBUJA, ALTO_BURBUJA);

  if (!puedeEscribir) return null;

  function alternar() {
    if (consumirArrastre()) return;
    if (abierto) {
      anclarEsquina(ANCHO_PANEL, ALTO_PANEL, ANCHO_BURBUJA, ALTO_BURBUJA);
    } else {
      anclarEsquina(ANCHO_BURBUJA, ALTO_BURBUJA, ANCHO_PANEL, ALTO_PANEL);
    }
    setAbierto(!abierto);
  }

  return (
    <>
      <div className="agente-extractor-widget" style={{ left: pos.x, top: pos.y }}>
        {abierto ? (
          <AgenteExtractorChat
            mensajes={agente.mensajes}
            borrador={agente.borrador}
            listoParaConfirmar={agente.listoParaConfirmar}
            enviando={agente.enviando}
            onEnviar={agente.enviar}
            onExtraerImagen={() => setMetodoExtraccion('elegir')}
            onRevisar={() => setMostrarResumen(true)}
            onColapsar={alternar}
            onArrastreHeader={(e) => iniciarArrastre(e, ANCHO_PANEL, ALTO_PANEL)}
          />
        ) : (
          <button
            type="button"
            className="agente-extractor-bubble"
            onPointerDown={(e) => iniciarArrastre(e, ANCHO_BURBUJA, ALTO_BURBUJA)}
            onClick={alternar}
            title="Agente extractor del planograma"
          >
            Chat
          </button>
        )}
      </div>

      {metodoExtraccion === 'elegir' && (
        <SeleccionarMetodoExtraccionModal
          onClose={() => setMetodoExtraccion('ninguno')}
          onSeleccionarImagenNumerada={() => setMetodoExtraccion('imagen-numerada')}
          onSeleccionarVisionCatalogo={() => setMetodoExtraccion('vision-catalogo')}
        />
      )}

      {metodoExtraccion === 'imagen-numerada' && (
        <ExtractorImagenNumeradaModal
          onClose={() => setMetodoExtraccion('ninguno')}
          onAceptar={(mensaje) => {
            setMetodoExtraccion('ninguno');
            agente.enviar(mensaje);
          }}
        />
      )}

      {metodoExtraccion === 'vision-catalogo' && (
        <ExtractorVisionCatalogoModal
          subcategorias={subcategorias}
          gondola={gondolaActiva}
          categoria={categoria}
          onClose={() => setMetodoExtraccion('ninguno')}
          onAceptar={(mensaje) => {
            setMetodoExtraccion('ninguno');
            agente.enviar(mensaje);
          }}
        />
      )}

      {mostrarResumen && (
        <ResumenBorradorModal
          borrador={agente.borrador}
          versionId={versionId}
          gondolas={gondolas}
          niveles={niveles}
          posicionesPorNivel={posicionesPorNivel}
          accesorios={accesorios}
          onClose={() => setMostrarResumen(false)}
          onConfirmado={() => {
            // No cierra el modal todavía: se queda mostrando el resumen de resultados
            // (ejecutada/fallida/omitida por acción) hasta que el usuario lo cierre a mano.
            setAbierto(false);
            agente.reiniciar();
            recargarNiveles();
            recargarPosiciones();
            onConfirmado();
          }}
        />
      )}
    </>
  );
}
