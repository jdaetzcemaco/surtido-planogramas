import { useState, type DragEvent } from 'react';
import { CapacityBar } from '../CapacityBar/CapacityBar';
import { PosicionCard } from '../PosicionCard/PosicionCard';
import { SeleccionarModoPosicionModal } from '../../modales/SeleccionarModoPosicionModal/SeleccionarModoPosicionModal';
import { PosicionFormModal } from '../../modales/PosicionFormModal/PosicionFormModal';
import { ElegirProductoModal } from '../../modales/ElegirProductoModal/ElegirProductoModal';
import { AsignarSkuModal } from '../../modales/AsignarSkuModal/AsignarSkuModal';
import { leerDatosArrastre, type DatosArrastrePosicion } from '../../../../utils/dragPosicion';
import type { Nivel } from '../../../../types/nivel';
import type { PosicionConProducto, PosicionesDeNivel } from '../../../../types/posicion';
import './PosicionesPanel.css';

type ModoAgregarPosicion = 'seleccion' | 'manual' | 'producto' | null;

interface PosicionesPanelProps {
  nivel: Nivel;
  datos: PosicionesDeNivel | undefined;
  cargando: boolean;
  puedeEscribir: boolean;
  subcategorias: string[];
  onCambio: () => void;
  seleccionadaId: number | null;
  onSeleccionar: (posicionId: number) => void;
  onDetalle: (posicion: PosicionConProducto) => void;
  onAbrirFicha: (sku: string) => void;
  onSoltarPosicion: (datos: DatosArrastrePosicion, nivelDestinoId: number, ordenDestino: number) => void;
}

export function PosicionesPanel({
  nivel,
  datos,
  cargando,
  puedeEscribir,
  subcategorias,
  onCambio,
  seleccionadaId,
  onSeleccionar,
  onDetalle,
  onAbrirFicha,
  onSoltarPosicion,
}: PosicionesPanelProps) {
  const [modoAgregar, setModoAgregar] = useState<ModoAgregarPosicion>(null);
  const [posicionPendiente, setPosicionPendiente] = useState<PosicionConProducto | null>(null);

  const posiciones = datos?.posiciones ?? [];

  function onDropEnLista(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const arrastre = leerDatosArrastre(e);
    if (!arrastre) return;
    const mismoNivel = arrastre.nivelOrigenId === nivel.id;
    onSoltarPosicion(arrastre, nivel.id, mismoNivel ? posiciones.length : posiciones.length + 1);
  }

  return (
    <div className="posiciones-panel">
      <div
        className="posiciones-panel__lista"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropEnLista}
      >
        {posiciones.map((posicion) => (
          <PosicionCard
            key={posicion.id}
            posicion={posicion}
            seleccionada={posicion.id === seleccionadaId}
            puedeEscribir={puedeEscribir}
            onSeleccionar={onSeleccionar}
            onDetalle={onDetalle}
            onAbrirFicha={onAbrirFicha}
            onSoltarPosicion={onSoltarPosicion}
            onAsignarSku={puedeEscribir ? setPosicionPendiente : undefined}
          />
        ))}

        {puedeEscribir && (
          <button
            type="button"
            className="posiciones-panel__agregar"
            title="Agregar posición"
            onClick={() => setModoAgregar('seleccion')}
          >
            +
          </button>
        )}
      </div>

      {cargando && <p className="posiciones-panel__vacio">Cargando posiciones…</p>}
      {!cargando && posiciones.length === 0 && (
        <p className="posiciones-panel__vacio">Este nivel todavía no tiene posiciones.</p>
      )}

      {datos && (
        <div className="posiciones-panel__capacidad">
          <CapacityBar ocupadoCm={datos.capacidad.ancho_ocupado_cm} disponibleCm={datos.capacidad.ancho_disponible_cm} />
        </div>
      )}

      {modoAgregar === 'seleccion' && (
        <SeleccionarModoPosicionModal
          onClose={() => setModoAgregar(null)}
          onSeleccionarManual={() => setModoAgregar('manual')}
          onSeleccionarProducto={() => setModoAgregar('producto')}
        />
      )}

      {modoAgregar === 'manual' && (
        <PosicionFormModal
          nivelId={nivel.id}
          proximoOrden={posiciones.length + 1}
          onClose={() => setModoAgregar(null)}
          onGuardada={() => {
            setModoAgregar(null);
            onCambio();
          }}
        />
      )}

      {modoAgregar === 'producto' && (
        <ElegirProductoModal
          nivelId={nivel.id}
          proximoOrden={posiciones.length + 1}
          subcategorias={subcategorias}
          onClose={() => setModoAgregar(null)}
          onAgregada={() => {
            setModoAgregar(null);
            onCambio();
          }}
        />
      )}

      {posicionPendiente && (
        <AsignarSkuModal
          posicion={posicionPendiente}
          subcategorias={subcategorias}
          onClose={() => setPosicionPendiente(null)}
          onAsignado={(actualizada) => {
            setPosicionPendiente(null);
            onCambio();
          }}
        />
      )}
    </div>
  );
}
