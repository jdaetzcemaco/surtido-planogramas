import type { DragEvent } from 'react';
import { PosicionLienzo } from '../PosicionLienzo/PosicionLienzo';
import type {
  CapacidadNivel,
  NivelLienzo,
  PosicionLienzo as PosicionLienzoModelo,
  ProductoCatalogo,
} from '../../../../domain/lienzo/lienzo.types';
import { PX_POR_CM } from '../constantesLienzo';
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
  onEliminarNivel: (nivelId: string) => void;
  onSoltarProductoEnNivel: (nivelId: string, sku: string) => void;
  onSoltarPosicionEnNivel: (posicionId: string, nivelDestinoId: string) => void;
  onAsignarSkuPorDrop: (posicionId: string, sku: string) => void;
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
  onEliminarNivel,
  onSoltarProductoEnNivel,
  onSoltarPosicionEnNivel,
  onAsignarSkuPorDrop,
}: NivelFilaLienzoProps) {
  const porcentaje = capacidad.disponibleCm > 0 ? Math.min((capacidad.ocupadoCm / capacidad.disponibleCm) * 100, 100) : 0;

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
        <button
          type="button"
          className="nivel-fila-lienzo__quitar"
          title="Eliminar nivel"
          aria-label="Eliminar nivel"
          onClick={() => onEliminarNivel(nivel.id)}
        >
          ×
        </button>
      )}

      <div
        className="nivel-fila-lienzo__pista"
        onDragOver={puedeEscribir ? (e) => e.preventDefault() : undefined}
        onDrop={puedeEscribir ? onDropEnPista : undefined}
      >
        {nivel.posiciones.map((posicion) => (
          <PosicionLienzo
            key={posicion.id}
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
        ))}

        {capacidad.libreCm > 2 && (
          <div className="nivel-fila-lienzo__espacio-libre" style={{ width: capacidad.libreCm * PX_POR_CM }}>
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
