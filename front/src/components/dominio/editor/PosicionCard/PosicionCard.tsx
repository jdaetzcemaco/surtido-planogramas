import type { DragEvent } from 'react';
import { FacingTile } from '../FacingTile/FacingTile';
import { escribirDatosArrastre, leerDatosArrastre, type DatosArrastrePosicion } from '../../../../utils/dragPosicion';
import type { PosicionConProducto } from '../../../../types/posicion';
import './PosicionCard.css';

interface PosicionCardProps {
  posicion: PosicionConProducto;
  seleccionada: boolean;
  puedeEscribir: boolean;
  onSeleccionar: (posicionId: number) => void;
  onDetalle: (posicion: PosicionConProducto) => void;
  onAbrirFicha: (sku: string) => void;
  onSoltarPosicion: (datos: DatosArrastrePosicion, nivelDestinoId: number, ordenDestino: number) => void;
  onAsignarSku?: (posicion: PosicionConProducto) => void;
}

export function PosicionCard({
  posicion,
  seleccionada,
  puedeEscribir,
  onSeleccionar,
  onDetalle,
  onAbrirFicha,
  onSoltarPosicion,
  onAsignarSku,
}: PosicionCardProps) {
  const esPendiente = posicion.modo === 'PENDIENTE';
  const tieneIa = !esPendiente && posicion.confidence < 100;

  function onDragStart(e: DragEvent<HTMLDivElement>) {
    if (esPendiente) return;
    escribirDatosArrastre(e, { posicionId: posicion.id, nivelOrigenId: posicion.nivelId });
  }

  function onDropAqui(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const datos = leerDatosArrastre(e);
    if (!datos || datos.posicionId === posicion.id) return;
    onSoltarPosicion(datos, posicion.nivelId, posicion.orden_horizontal);
  }

  function handleClick() {
    if (esPendiente && puedeEscribir && onAsignarSku) {
      onAsignarSku(posicion);
      return;
    }
    onSeleccionar(posicion.id);
  }

  if (esPendiente) {
    return (
      <div
        className={`posicion-card posicion-card--pendiente${seleccionada ? ' posicion-card--seleccionada' : ''}`}
        onClick={handleClick}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropAqui}
        title={posicion.nombre_detectado ? `Detectado: ${posicion.nombre_detectado}` : 'Posición pendiente de asignación'}
      >
        <span className="posicion-card__badge-pendiente">?</span>
        {posicion.confidence < 100 && (
          <span className="posicion-card__badge-confidence">{posicion.confidence}%</span>
        )}
        <div className="posicion-card__pendiente-body">
          <span className="posicion-card__pendiente-icon">📦</span>
          {posicion.nombre_detectado && (
            <span className="posicion-card__pendiente-nombre">{posicion.nombre_detectado}</span>
          )}
          {puedeEscribir && (
            <span className="posicion-card__pendiente-hint">Clic para asignar</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`posicion-card${seleccionada ? ' posicion-card--seleccionada' : ''}`}
      draggable={puedeEscribir}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropAqui}
      onClick={() => onSeleccionar(posicion.id)}
      onDoubleClick={() => {
        onSeleccionar(posicion.id);
        onDetalle(posicion);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onSeleccionar(posicion.id);
        if (posicion.sku) onAbrirFicha(posicion.sku);
      }}
      title={posicion.producto?.nombre ?? posicion.sku ?? undefined}
    >
      <span className="posicion-card__badge-facings">×{posicion.facings_horizontal}</span>
      {tieneIa && (
        <span className="posicion-card__badge-ia">IA · {posicion.confidence}%</span>
      )}

      <div className="posicion-card__facings">
        {Array.from({ length: posicion.facings_horizontal }).map((_, i) => (
          <FacingTile
            key={i}
            sku={posicion.sku}
            nombre={posicion.producto?.nombre ?? null}
            imagenUrl={posicion.producto?.imagen_url ?? null}
            cantidadApilable={posicion.cantidad_apilable}
          />
        ))}
      </div>
    </div>
  );
}
