import { Fragment, type DragEvent } from 'react';
import { PosicionLienzo } from '../PosicionLienzo/PosicionLienzo';
import type {
  CapacidadNivel,
  NivelLienzo,
  PosicionLienzo as PosicionLienzoModelo,
  ProductoCatalogo,
} from '../../../../domain/lienzo/lienzo.types';
import './NivelFilaLienzo.css';

const TIPO_ARRASTRE_PRODUCTO = 'application/x-lienzo-producto';
const TIPO_ARRASTRE_POSICION = 'application/x-lienzo-posicion';

interface NivelFilaLienzoProps {
  nivel: NivelLienzo;
  alturaPx: number;
  capacidad: CapacidadNivel;
  puedeEscribir: boolean;
  posicionSeleccionadaId: string | null;
  resolverProducto: (sku: string) => ProductoCatalogo | undefined;
  /** Decide si una posición muestra la cinta de "desborda" — ver `GondolaFrameLienzo`. */
  resolverDesborda: (posicion: PosicionLienzoModelo) => boolean;
  onSeleccionarPosicion: (id: string) => void;
  onAbrirDetallePosicion: (id: string) => void;
  onAbrirFichaPosicion: (sku: string) => void;
  onEditarNivel: (nivelId: string) => void;
  onEliminarNivel: (nivelId: string) => void;
  onSoltarProductoEnNivel: (nivelId: string, sku: string) => void;
  onSoltarPosicionEnNivel: (posicionId: string, nivelDestinoId: string) => void;
  onAsignarSkuPorDrop: (posicionId: string, sku: string) => void;
  onAgregarPosicionPendiente: (nivelId: string, ordenDestino: number) => void;
}

/**
 * Una fila de nivel dentro de una góndola del Lienzo: el badge de orden, la "pista" con sus
 * posiciones (más el espacio físico sobrante, si lo hay) y la barra de capacidad ocupado/
 * disponible — mismo criterio que `NivelRow` + `CapacityBar` en el Editor real, adaptado a
 * cajas dibujadas a escala en vez de una lista.
 */
export function NivelFilaLienzo({
  nivel,
  alturaPx,
  capacidad,
  puedeEscribir,
  posicionSeleccionadaId,
  resolverProducto,
  resolverDesborda,
  onSeleccionarPosicion,
  onAbrirDetallePosicion,
  onAbrirFichaPosicion,
  onEditarNivel,
  onEliminarNivel,
  onSoltarProductoEnNivel,
  onSoltarPosicionEnNivel,
  onAsignarSkuPorDrop,
  onAgregarPosicionPendiente,
}: NivelFilaLienzoProps) {
  const porcentaje = capacidad.disponibleCm > 0 ? Math.min((capacidad.ocupadoCm / capacidad.disponibleCm) * 100, 100) : 0;

  const mostrarLibre = capacidad.libreCm > 2;

  function onDragStartPosicion(e: DragEvent<HTMLDivElement>, posicionId: string) {
    e.dataTransfer.setData(TIPO_ARRASTRE_POSICION, posicionId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDropEnPista(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const sku = e.dataTransfer.getData(TIPO_ARRASTRE_PRODUCTO);
    if (sku) {
      onSoltarProductoEnNivel(nivel.id, sku);
      return;
    }
    const posicionId = e.dataTransfer.getData(TIPO_ARRASTRE_POSICION);
    if (posicionId) onSoltarPosicionEnNivel(posicionId, nivel.id);
  }

  const tituloNivel = [
    `Nivel ${nivel.orden}`,
    `${nivel.alturaDesdePisoCm} cm desde el piso`,
    nivel.tipoAccesorio,
    nivel.notas,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="nivel-fila-lienzo" style={{ minHeight: alturaPx }}>
      <span className="nivel-fila-lienzo__badge" title={tituloNivel}>
        {nivel.orden}
      </span>
      {puedeEscribir && (
        <>
          <button
            type="button"
            className="nivel-fila-lienzo__editar"
            title="Editar nivel"
            aria-label="Editar nivel"
            onClick={() => onEditarNivel(nivel.id)}
          >
            ✎
          </button>
          <button
            type="button"
            className="nivel-fila-lienzo__quitar"
            title="Eliminar nivel"
            aria-label="Eliminar nivel"
            onClick={() => onEliminarNivel(nivel.id)}
          >
            ×
          </button>
        </>
      )}

      <div
        className="nivel-fila-lienzo__pista"
        onDragOver={puedeEscribir ? (e) => e.preventDefault() : undefined}
        onDrop={puedeEscribir ? onDropEnPista : undefined}
      >
        {puedeEscribir && <GapInsercionPosicion nivelId={nivel.id} ordenDestino={1} onAgregarPosicionPendiente={onAgregarPosicionPendiente} />}
        {nivel.posiciones.map((posicion, indice) => (
          <Fragment key={posicion.id}>
            <PosicionLienzo
              posicion={posicion}
              producto={posicion.sku ? (resolverProducto(posicion.sku) ?? null) : null}
              seleccionada={posicion.id === posicionSeleccionadaId}
              desborda={resolverDesborda(posicion)}
              puedeArrastrar={puedeEscribir}
              onSeleccionar={() => onSeleccionarPosicion(posicion.id)}
              onAbrirDetalle={() => onAbrirDetallePosicion(posicion.id)}
              onAbrirFicha={onAbrirFichaPosicion}
              onDragStart={(e) => onDragStartPosicion(e, posicion.id)}
              onSoltarProducto={(sku) => onAsignarSkuPorDrop(posicion.id, sku)}
            />
            {puedeEscribir && (
              <GapInsercionPosicion nivelId={nivel.id} ordenDestino={indice + 2} onAgregarPosicionPendiente={onAgregarPosicionPendiente} />
            )}
          </Fragment>
        ))}

        {mostrarLibre && (
          <div className="nivel-fila-lienzo__espacio-libre">
            <span>Espacio libre · {capacidad.libreCm.toFixed(0)} cm</span>
          </div>
        )}
      </div>

      <div className="nivel-fila-lienzo__capacidad">
        <div className="nivel-fila-lienzo__capbar">
          <div
            className={`nivel-fila-lienzo__capbar-fill${capacidad.sobreOcupado ? ' nivel-fila-lienzo__capbar-fill--sobre' : ''}`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <span className={`nivel-fila-lienzo__capacidad-texto${capacidad.sobreOcupado ? ' nivel-fila-lienzo__capacidad-texto--sobre' : ''}`}>
          {capacidad.ocupadoCm.toFixed(1)} / {capacidad.disponibleCm.toFixed(1)} cm
          {capacidad.sobreOcupado && ' · sobre-ocupado'}
        </span>
      </div>
    </div>
  );
}

/**
 * Hueco entre dos posiciones (o en la punta/el final de la pista) donde aparece un "+" para
 * insertar ahí una posición PENDIENTE vacía — mismo gesto que `GapInsercion` en
 * `GondolaFrameLienzo` para insertar un nivel, aplicado ahora horizontalmente entre productos.
 *
 * Es un elemento de ancho 0 dentro de la pista (`flex:none`, `margin-right:-5px`): cancela
 * exactamente uno de los dos `gap` de 5px que el flex de `.nivel-fila-lienzo__pista` inserta
 * alrededor suyo, así que insertarlo entre dos posiciones no le suma ancho extra a la fila (ver
 * `constantesLienzo.ts` sobre por qué el ancho de la fila es sensible a esto). El botón en sí
 * vive en una zona de hover más grande, posicionada absoluta y centrada sobre ese punto — el
 * ancho 0 del contenedor no le da área de hover propia.
 */
function GapInsercionPosicion({
  nivelId,
  ordenDestino,
  onAgregarPosicionPendiente,
}: {
  nivelId: string;
  ordenDestino: number;
  onAgregarPosicionPendiente: (nivelId: string, ordenDestino: number) => void;
}) {
  return (
    <div className="nivel-fila-lienzo__gap-posicion">
      <div className="nivel-fila-lienzo__gap-posicion-zona">
        <button
          type="button"
          className="nivel-fila-lienzo__gap-posicion-boton"
          title="Insertar espacio aquí"
          onClick={() => onAgregarPosicionPendiente(nivelId, ordenDestino)}
        >
          +
        </button>
      </div>
    </div>
  );
}
