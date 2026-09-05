import type { ReactNode, RefObject } from 'react';
import type { ViewportState } from '../../../../hooks/useCanvasViewport';
import './LienzoCanvas.css';

interface LienzoCanvasProps {
  contenedorRef: RefObject<HTMLDivElement | null>;
  view: ViewportState;
  enPan: boolean;
  mostrarCuadricula: boolean;
  handlers: {
    onPointerDown: React.PointerEventHandler<HTMLDivElement>;
    onPointerMove: React.PointerEventHandler<HTMLDivElement>;
    onPointerUp: React.PointerEventHandler<HTMLDivElement>;
    onWheel: React.WheelEventHandler<HTMLDivElement>;
  };
  children: ReactNode;
}

const TAMANO_CUADRICULA_PX = 28;

/**
 * Contenedor del lienzo infinito (pan con el fondo, zoom con la rueda/controles) al estilo
 * n8n: aplica la transformación de `useCanvasViewport` a un "mundo" absoluto donde se dibujan
 * las góndolas. El fondo punteado se mueve/escala junto con el mundo para reforzar la
 * sensación de estar navegando un plano, no una lista.
 */
export function LienzoCanvas({ contenedorRef, view, enPan, mostrarCuadricula, handlers, children }: LienzoCanvasProps) {
  return (
    <div
      ref={contenedorRef}
      className={`lienzo-canvas${enPan ? ' lienzo-canvas--pan' : ''}${mostrarCuadricula ? '' : ' lienzo-canvas--sin-cuadricula'}`}
      style={{
        backgroundPosition: `${view.x}px ${view.y}px`,
        backgroundSize: `${TAMANO_CUADRICULA_PX * view.scale}px ${TAMANO_CUADRICULA_PX * view.scale}px`,
      }}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerLeave={handlers.onPointerUp}
      onWheel={handlers.onWheel}
    >
      <div
        className="lienzo-canvas__mundo"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
