import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { NivelFilaLienzo } from '../NivelFilaLienzo/NivelFilaLienzo';
import type { CapacidadNivel, GondolaLienzo, NivelLienzo, PosicionLienzo, ProductoCatalogo } from '../../../../domain/lienzo/lienzo.types';
import { calcularGapCm } from '../../../../domain/lienzo/geometria.service';
import { calcularCapacidadNivel } from '../../../../domain/lienzo/capacidad.service';
import { ALTURA_MIN_NIVEL_PX, CHROME_GONDOLA_PX, PX_POR_CM } from '../constantesLienzo';
import './GondolaFrameLienzo.css';

interface GondolaFrameLienzoProps {
  gondola: GondolaLienzo;
  /** Escala actual del lienzo (`view.scale` de `useCanvasViewport`) — necesaria para convertir
   * el desplazamiento en píxeles de pantalla al arrastrar el encabezado a desplazamiento en
   * coordenadas de mundo. */
  scale: number;
  /** Igual que en el Editor real: sin permiso de escritura no se muestran arrastres ni botones de agregar/quitar. */
  puedeEscribir: boolean;
  posicionSeleccionadaId: string | null;
  resolverProducto: (sku: string) => ProductoCatalogo | undefined;
  /**
   * Cómo calcular la capacidad de un nivel. Por defecto asume que el ancho disponible es el
   * ancho de la góndola (criterio de los datos de ejemplo); cuando el Lienzo está conectado al
   * backend real, cada nivel ya trae su propio `ancho_disponible_cm` — el llamador inyecta ese
   * cálculo real acá en vez de dejar el valor por defecto.
   */
  resolverCapacidad?: (nivel: NivelLienzo) => CapacidadNivel;
  /**
   * Cómo decidir si una posición "desborda" el nivel. Por defecto lo infiere geométricamente
   * (alto de la posición vs. hueco libre) — útil sobre datos de ejemplo. El dominio real no
   * registra el alto físico de una posición ya colocada; ahí el llamador inyecta la bandera
   * manual `desborda_gondola` en su lugar.
   */
  resolverDesborda?: (posicion: PosicionLienzo, gapCm: number) => boolean;
  onMoverGondola: (gondolaId: string, x: number, y: number) => void;
  onEditarGondola?: (gondolaId: string) => void;
  onEliminarGondola?: (gondolaId: string) => void;
  onAgregarNivel: (gondolaId: string, ordenDestino: number) => void;
  onEliminarNivel: (nivelId: string) => void;
  onSeleccionarPosicion: (id: string) => void;
  onAbrirDetallePosicion: (id: string) => void;
  onAbrirFichaPosicion: (sku: string) => void;
  onSoltarProductoEnNivel: (nivelId: string, sku: string) => void;
  onSoltarPosicionEnNivel: (posicionId: string, nivelDestinoId: string) => void;
  onAsignarSkuPorDrop: (posicionId: string, sku: string) => void;
}

const resolverCapacidadPorDefecto = (nivel: NivelLienzo, anchoGondolaCm: number) => calcularCapacidadNivel(nivel, anchoGondolaCm);
const resolverDesbordaPorDefecto = (posicion: PosicionLienzo, gapCm: number) => posicion.altoCm > gapCm;

/**
 * Una góndola dibujada como "frame" independiente sobre el lienzo (inspirado en cómo n8n
 * dibuja cada flujo): encabezado arrastrable, regla vertical de cm desde el piso, y sus
 * niveles apilados de abajo (orden 1) hacia arriba. Entre niveles aparece un botón "+" al
 * pasar el mouse para insertar un nivel nuevo ahí — el mismo gesto que n8n usa para insertar
 * un nodo en medio de una conexión.
 */
export function GondolaFrameLienzo({
  gondola,
  scale,
  puedeEscribir,
  posicionSeleccionadaId,
  resolverProducto,
  resolverCapacidad,
  resolverDesborda,
  onMoverGondola,
  onEditarGondola,
  onEliminarGondola,
  onAgregarNivel,
  onEliminarNivel,
  onSeleccionarPosicion,
  onAbrirDetallePosicion,
  onAbrirFichaPosicion,
  onSoltarProductoEnNivel,
  onSoltarPosicionEnNivel,
  onAsignarSkuPorDrop,
}: GondolaFrameLienzoProps) {
  const [arrastrando, setArrastrando] = useState(false);

  function onPointerDownEncabezado(e: ReactPointerEvent<HTMLDivElement>) {
    if (!puedeEscribir || (e.target as HTMLElement).closest('button')) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const gx = gondola.x;
    const gy = gondola.y;
    setArrastrando(true);

    function onMove(ev: globalThis.PointerEvent) {
      onMoverGondola(gondola.id, gx + (ev.clientX - startX) / scale, gy + (ev.clientY - startY) / scale);
    }
    function onUp() {
      setArrastrando(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  const ordenadosAsc = [...gondola.niveles].sort((a, b) => a.orden - b.orden);
  const geometriaPorNivel = new Map<string, { pxAlto: number; gapCm: number; tickBottomPx: number }>();
  let acumuladoPx = 10; // el hueco inferior para insertar un nivel al piso mide 10px (ver `.gap-lienzo`)
  for (const nivel of ordenadosAsc) {
    const gapCm = calcularGapCm(gondola, nivel);
    const pxAlto = Math.max(gapCm * PX_POR_CM, ALTURA_MIN_NIVEL_PX);
    geometriaPorNivel.set(nivel.id, { pxAlto, gapCm, tickBottomPx: acumuladoPx });
    acumuladoPx += pxAlto + 10;
  }

  const ordenadosDesc = [...gondola.niveles].sort((a, b) => b.orden - a.orden);
  const ordenMasAlto = ordenadosDesc[0]?.orden ?? 0;

  return (
    <div
      className={`gondola-frame-lienzo${arrastrando ? ' gondola-frame-lienzo--arrastrando' : ''}`}
      data-frame-lienzo
      style={{ left: gondola.x, top: gondola.y, width: gondola.anchoCm * PX_POR_CM + CHROME_GONDOLA_PX }}
    >
      <div className="gondola-frame-lienzo__header" onPointerDown={onPointerDownEncabezado}>
        <span className="gondola-frame-lienzo__nombre">{gondola.nombre}</span>
        <span className="gondola-frame-lienzo__ancho">{gondola.anchoCm} cm</span>
        {puedeEscribir && (
          <span className="gondola-frame-lienzo__acciones">
            <button type="button" className="gondola-frame-lienzo__agregar-nivel" onClick={() => onAgregarNivel(gondola.id, ordenMasAlto + 1)}>
              + nivel
            </button>
            {onEditarGondola && (
              <button type="button" title="Editar góndola" aria-label="Editar góndola" onClick={() => onEditarGondola(gondola.id)}>
                ✎
              </button>
            )}
            {onEliminarGondola && (
              <button type="button" title="Eliminar góndola" aria-label="Eliminar góndola" onClick={() => onEliminarGondola(gondola.id)}>
                ×
              </button>
            )}
          </span>
        )}
      </div>

      <div className="gondola-frame-lienzo__body">
        <div className="gondola-frame-lienzo__ruler">
          {ordenadosAsc.map((nivel) => (
            <div key={nivel.id} className="gondola-frame-lienzo__tick" style={{ bottom: geometriaPorNivel.get(nivel.id)!.tickBottomPx }}>
              <span>{nivel.alturaDesdePisoCm}</span>
            </div>
          ))}
        </div>

        <div className="gondola-frame-lienzo__niveles">
          {puedeEscribir && <GapInsercion gondolaId={gondola.id} ordenDestino={ordenMasAlto + 1} onAgregarNivel={onAgregarNivel} />}
          {ordenadosDesc.map((nivel) => {
            const geometria = geometriaPorNivel.get(nivel.id)!;
            return (
              <div key={nivel.id}>
                <NivelFilaLienzo
                  nivel={nivel}
                  alturaPx={geometria.pxAlto}
                  puedeEscribir={puedeEscribir}
                  capacidad={(resolverCapacidad ?? ((n) => resolverCapacidadPorDefecto(n, gondola.anchoCm)))(nivel)}
                  resolverDesborda={(posicion) => (resolverDesborda ?? resolverDesbordaPorDefecto)(posicion, geometria.gapCm)}
                  posicionSeleccionadaId={posicionSeleccionadaId}
                  resolverProducto={resolverProducto}
                  onSeleccionarPosicion={onSeleccionarPosicion}
                  onAbrirDetallePosicion={onAbrirDetallePosicion}
                  onAbrirFichaPosicion={onAbrirFichaPosicion}
                  onEliminarNivel={onEliminarNivel}
                  onSoltarProductoEnNivel={onSoltarProductoEnNivel}
                  onSoltarPosicionEnNivel={onSoltarPosicionEnNivel}
                  onAsignarSkuPorDrop={onAsignarSkuPorDrop}
                />
                {puedeEscribir && <GapInsercion gondolaId={gondola.id} ordenDestino={nivel.orden} onAgregarNivel={onAgregarNivel} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Hueco entre dos niveles (o en la punta/el piso) donde aparece un "+" para insertar un nivel ahí. */
function GapInsercion({
  gondolaId,
  ordenDestino,
  onAgregarNivel,
}: {
  gondolaId: string;
  ordenDestino: number;
  onAgregarNivel: (gondolaId: string, ordenDestino: number) => void;
}) {
  return (
    <div className="gondola-frame-lienzo__gap">
      <button
        type="button"
        className="gondola-frame-lienzo__gap-boton"
        title="Insertar nivel aquí"
        onClick={() => onAgregarNivel(gondolaId, ordenDestino)}
      >
        +
      </button>
    </div>
  );
}
