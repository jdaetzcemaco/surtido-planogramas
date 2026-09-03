import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

interface Posicion {
  x: number;
  y: number;
}

const MARGEN = 24;

function clamp(valor: number, min: number, max: number): number {
  return Math.min(Math.max(valor, min), max);
}

function clampPosicion(pos: Posicion, ancho: number, alto: number): Posicion {
  const maxX = Math.max(MARGEN, window.innerWidth - ancho - MARGEN);
  const maxY = Math.max(MARGEN, window.innerHeight - alto - MARGEN);
  return { x: clamp(pos.x, MARGEN, maxX), y: clamp(pos.y, MARGEN, maxY) };
}

/** Posición arrastrable de un widget flotante (esquina superior izquierda), pensada para el
 * agente extractor: alterna entre burbuja colapsada y panel expandido, cada uno con su propio
 * tamaño, sin perder de vista la ventana visible. */
export function usePosicionFlotante(anchoInicial: number, altoInicial: number) {
  const [pos, setPos] = useState<Posicion>(() =>
    clampPosicion(
      { x: window.innerWidth - anchoInicial - MARGEN, y: window.innerHeight - altoInicial - MARGEN },
      anchoInicial,
      altoInicial,
    ),
  );
  const arrastre = useRef<{ inicioX: number; inicioY: number; origenX: number; origenY: number; movido: boolean } | null>(
    null,
  );

  function iniciarArrastre(e: ReactPointerEvent, ancho: number, alto: number) {
    if (e.button !== 0) return;
    arrastre.current = { inicioX: e.clientX, inicioY: e.clientY, origenX: pos.x, origenY: pos.y, movido: false };

    function mover(ev: PointerEvent) {
      if (!arrastre.current) return;
      const dx = ev.clientX - arrastre.current.inicioX;
      const dy = ev.clientY - arrastre.current.inicioY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) arrastre.current.movido = true;
      setPos(clampPosicion({ x: arrastre.current.origenX + dx, y: arrastre.current.origenY + dy }, ancho, alto));
    }
    function soltar() {
      document.removeEventListener('pointermove', mover);
      document.removeEventListener('pointerup', soltar);
    }
    document.addEventListener('pointermove', mover);
    document.addEventListener('pointerup', soltar);
  }

  /** true si el gesto anterior fue un arrastre (no un click) — se consulta una sola vez y se
   * resetea, para no confundir "soltar tras mover" con "click para alternar". */
  function consumirArrastre(): boolean {
    const fueArrastre = arrastre.current?.movido ?? false;
    if (arrastre.current) arrastre.current.movido = false;
    return fueArrastre;
  }

  /** Al pasar de burbuja a panel (o viceversa) mantiene fija la esquina inferior derecha, para que
   * el widget no "salte" lejos de donde estaba. */
  function anclarEsquina(anchoAnterior: number, altoAnterior: number, anchoNuevo: number, altoNuevo: number) {
    setPos((actual) =>
      clampPosicion({ x: actual.x + anchoAnterior - anchoNuevo, y: actual.y + altoAnterior - altoNuevo }, anchoNuevo, altoNuevo),
    );
  }

  return { pos, iniciarArrastre, consumirArrastre, anclarEsquina };
}
