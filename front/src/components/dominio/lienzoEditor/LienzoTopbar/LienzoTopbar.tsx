import type { FormEvent } from 'react';
import type { TemaLienzo } from '../../../../domain/lienzo/lienzo.types';
import './LienzoTopbar.css';

interface LienzoTopbarProps {
  onIrAEditor: () => void;
  buscarSku: string;
  onBuscarSkuChange: (valor: string) => void;
  onBuscarSkuSubmit: (valor: string) => void;
  zoomPorcentaje: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomCambiar: (porcentaje: number) => void;
  onAjustarZoom: () => void;
  cuadriculaActiva: boolean;
  onToggleCuadricula: () => void;
  tema: TemaLienzo;
  onAlternarTema: () => void;
}

/**
 * Franja de controles propia del Lienzo (búsqueda de SKU, alternar Editor/Lienzo, zoom,
 * cuadrícula y tema claro/oscuro) — se dibuja debajo del `AppTopbar` compartido con el resto
 * de la aplicación, con el mismo criterio que ya usa `EditorPlanograma` (una barra de acciones
 * propia de la página, debajo del encabezado genérico).
 */
export function LienzoTopbar({
  onIrAEditor,
  buscarSku,
  onBuscarSkuChange,
  onBuscarSkuSubmit,
  zoomPorcentaje,
  onZoomIn,
  onZoomOut,
  onZoomCambiar,
  onAjustarZoom,
  cuadriculaActiva,
  onToggleCuadricula,
  tema,
  onAlternarTema,
}: LienzoTopbarProps) {
  function onSubmitBusqueda(e: FormEvent) {
    e.preventDefault();
    onBuscarSkuSubmit(buscarSku);
  }

  return (
    <div className="lienzo-topbar">
      <form className="lienzo-topbar__buscar" onSubmit={onSubmitBusqueda}>
        <input
          type="text"
          placeholder="¿Dónde está este SKU?"
          value={buscarSku}
          onChange={(e) => onBuscarSkuChange(e.target.value)}
        />
      </form>

      <div className="lienzo-topbar__viewtoggle">
        <button type="button" onClick={onIrAEditor}>
          Editor
        </button>
        <button type="button" className="is-activo">
          Lienzo
        </button>
      </div>

      <div className="lienzo-topbar__derecha">
        <div className="lienzo-topbar__zoom">
          <button type="button" title="Alejar" onClick={onZoomOut}>
            −
          </button>
          <input
            type="range"
            min={5}
            max={200}
            value={zoomPorcentaje}
            onChange={(e) => onZoomCambiar(Number(e.target.value))}
          />
          <button type="button" title="Acercar" onClick={onZoomIn}>
            +
          </button>
          <span>{zoomPorcentaje}%</span>
        </div>

        <button type="button" className="lienzo-topbar__icono" title="Ajustar a pantalla" onClick={onAjustarZoom}>
          ⤢
        </button>
        <button
          type="button"
          className="lienzo-topbar__icono"
          aria-pressed={cuadriculaActiva}
          title="Alternar cuadrícula"
          onClick={onToggleCuadricula}
        >
          ▦
        </button>
        <button
          type="button"
          className="lienzo-topbar__icono"
          title={tema === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          onClick={onAlternarTema}
        >
          {tema === 'oscuro' ? '☀' : '☾'}
        </button>
      </div>
    </div>
  );
}
