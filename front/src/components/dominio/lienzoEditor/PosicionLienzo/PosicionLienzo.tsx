import type { DragEvent } from 'react';
import type { PosicionLienzo as PosicionLienzoModelo, ProductoCatalogo } from '../../../../domain/lienzo/lienzo.types';
import { ANCHO_MIN_POSICION_PX, PX_POR_CM } from '../constantesLienzo';
import './PosicionLienzo.css';

interface PosicionLienzoProps {
  posicion: PosicionLienzoModelo;
  /** Producto de catálogo asociado al SKU de la posición — `null` si la posición está PENDIENTE. */
  producto: ProductoCatalogo | null;
  seleccionada: boolean;
  /** Si se debe mostrar la cinta de "desborda" — el llamador decide cómo calcularlo (ver `GondolaFrameLienzo`). */
  desborda: boolean;
  /** Igual que `draggable={puedeEscribir}` en `PosicionCard` — sin permiso de escritura, la posición no se puede arrastrar. */
  puedeArrastrar: boolean;
  onSeleccionar: () => void;
  /** Solo se usa para posiciones ya asignadas — igual que `PosicionCard`, una PENDIENTE no se arrastra, se hace clic para asignarle el SKU. */
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
  onSoltarProducto: (sku: string) => void;
}

/**
 * Una posición dentro de un nivel: un producto ya asignado (con sus frentes dibujados como
 * fichas) o una posición PENDIENTE (sin SKU confirmado, a la espera de que el analista la
 * asigne) — mismo criterio visual que `PosicionCard` en el Editor real: una posición PENDIENTE
 * se dibuja con el ícono 📦 de "imagen por defecto" en vez de fingir una foto que no existe.
 */
export function PosicionLienzo({
  posicion,
  producto,
  seleccionada,
  desborda,
  puedeArrastrar,
  onSeleccionar,
  onDragStart,
  onSoltarProducto,
}: PosicionLienzoProps) {
  const anchoPx = Math.max(posicion.anchoCm * PX_POR_CM, ANCHO_MIN_POSICION_PX);
  const altoPx = Math.min(Math.max(posicion.altoCm * PX_POR_CM, 24), 90);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const sku = e.dataTransfer.getData('application/x-lienzo-producto');
    if (sku) onSoltarProducto(sku);
  }

  if (posicion.modo === 'PENDIENTE') {
    return (
      <div
        className={`posicion-lienzo posicion-lienzo--pendiente${seleccionada ? ' posicion-lienzo--seleccionada' : ''}`}
        style={{ width: anchoPx, height: Math.min(altoPx, 90) }}
        onClick={onSeleccionar}
        onDragOver={puedeArrastrar ? (e) => e.preventDefault() : undefined}
        onDrop={puedeArrastrar ? onDrop : undefined}
        title={posicion.nombreDetectado ? `Detectado: ${posicion.nombreDetectado}` : 'Posición pendiente de asignación'}
      >
        <span className="posicion-lienzo__badge-pendiente">?</span>
        <div className="posicion-lienzo__cuerpo">
          <span className="posicion-lienzo__icono">📦</span>
          {posicion.nombreDetectado && <span className="posicion-lienzo__nombre">{posicion.nombreDetectado}</span>}
          <span className="posicion-lienzo__hint">Clic para asignar SKU</span>
        </div>
      </div>
    );
  }

  if (!producto) return null;

  const tileAncho = Math.max(producto.anchoCm * PX_POR_CM, 22);
  const tileAlto = Math.min(altoPx - 14, 64);

  return (
    <div
      className={`posicion-lienzo${seleccionada ? ' posicion-lienzo--seleccionada' : ''}${desborda ? ' posicion-lienzo--desborda' : ''}`}
      style={{ width: anchoPx, height: altoPx }}
      draggable={puedeArrastrar}
      onDragStart={onDragStart}
      onClick={onSeleccionar}
      title={`${producto.nombre} · ${posicion.sku}`}
    >
      <span className="posicion-lienzo__badge-facings">×{posicion.facings}</span>
      {posicion.confidence != null && posicion.confidence < 100 && (
        <span className="posicion-lienzo__badge-ia">IA · {posicion.confidence}%</span>
      )}
      {posicion.modo === 'CROSS' && <span className="posicion-lienzo__badge-cross">cross</span>}

      <div className="posicion-lienzo__tiles">
        {Array.from({ length: posicion.facings }).map((_, i) => (
          <div key={i} className="posicion-lienzo__tile" style={{ width: tileAncho, height: tileAlto }}>
            {producto.imagenUrl ? (
              <img className="posicion-lienzo__tile-foto" src={producto.imagenUrl} alt={producto.nombre} />
            ) : producto.colorFoto ? (
              <div
                className="posicion-lienzo__tile-foto"
                style={{ background: `linear-gradient(180deg, ${producto.colorFoto}22, ${producto.colorFoto})` }}
              />
            ) : (
              <div className="posicion-lienzo__tile-vacia">
                <span>{posicion.sku}</span>
              </div>
            )}
            {posicion.apilable > 1 && <span className="posicion-lienzo__tile-apilable">×{posicion.apilable}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
