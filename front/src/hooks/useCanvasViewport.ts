import { useCallback, useRef, useState, type PointerEvent, type WheelEvent } from 'react';

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface LimiteRectangulo {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const ESCALA_MIN = 0.35;
const ESCALA_MAX = 2.2;

function clampEscala(escala: number): number {
  return Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala));
}

/**
 * Encapsula el pan (arrastrar el fondo) y el zoom (rueda/controles) de un lienzo infinito al
 * estilo n8n, como coordenadas de "mundo" independientes de lo que se dibuje encima. Se separó
 * en su propio hook porque esta matemática (convertir posición de pantalla ↔ posición de
 * mundo, centrar el zoom en el cursor, ajustar a los bordes del contenido) no tiene nada que
 * ver con el dominio del planograma — es pura mecánica de canvas y así queda reutilizable/
 * testeable aparte.
 */
export function useCanvasViewport(inicial: ViewportState = { x: 120, y: 40, scale: 1 }) {
  const [view, setView] = useState<ViewportState>(inicial);
  const [enPan, setEnPan] = useState(false);
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{ startX: number; startY: number; vx: number; vy: number } | null>(null);

  /** Convierte una coordenada de pantalla (relativa al contenedor) a coordenada de mundo. */
  const aCoordenadaDeMundo = useCallback(
    (clientX: number, clientY: number) => {
      const rect = contenedorRef.current?.getBoundingClientRect();
      const mx = clientX - (rect?.left ?? 0);
      const my = clientY - (rect?.top ?? 0);
      return { x: (mx - view.x) / view.scale, y: (my - view.y) / view.scale, mx, my };
    },
    [view.x, view.y, view.scale],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      // Solo empieza a "pasear" el lienzo si el puntero bajó sobre el fondo — nunca si bajó
      // sobre una góndola, una posición o cualquier control interactivo (ver `data-frame-lienzo`
      // en `GondolaFrameLienzo`).
      if ((e.target as HTMLElement).closest('[data-frame-lienzo]')) return;
      panRef.current = { startX: e.clientX, startY: e.clientY, vx: view.x, vy: view.y };
      setEnPan(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [view.x, view.y],
  );

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!panRef.current) return;
    const { startX, startY, vx, vy } = panRef.current;
    setView((actual) => ({ ...actual, x: vx + (e.clientX - startX), y: vy + (e.clientY - startY) }));
  }, []);

  const onPointerUp = useCallback(() => {
    panRef.current = null;
    setEnPan(false);
  }, []);

  const onWheel = useCallback(
    (e: WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const { x: worldX, y: worldY, mx, my } = aCoordenadaDeMundo(e.clientX, e.clientY);
      const factor = Math.exp(-e.deltaY * 0.0012);
      setView((actual) => {
        const nuevaEscala = clampEscala(actual.scale * factor);
        return { scale: nuevaEscala, x: mx - worldX * nuevaEscala, y: my - worldY * nuevaEscala };
      });
    },
    [aCoordenadaDeMundo],
  );

  /** Cambia el zoom centrado en el medio del contenedor (o en un punto de pantalla dado). */
  const fijarEscala = useCallback((escala: number, centro?: { x: number; y: number }) => {
    const rect = contenedorRef.current?.getBoundingClientRect();
    const cx = centro?.x ?? (rect?.width ?? 0) / 2;
    const cy = centro?.y ?? (rect?.height ?? 0) / 2;
    setView((actual) => {
      const worldX = (cx - actual.x) / actual.scale;
      const worldY = (cy - actual.y) / actual.scale;
      const nuevaEscala = clampEscala(escala);
      return { scale: nuevaEscala, x: cx - worldX * nuevaEscala, y: cy - worldY * nuevaEscala };
    });
  }, []);

  /**
   * Centra y ajusta el zoom para que un rectángulo de contenido (coordenadas de mundo) entre
   * completo en pantalla. A propósito NO pasa por `clampEscala`/`ESCALA_MIN`: ese piso es un
   * límite razonable para el zoom manual (rueda/slider), pero "ajustar a pantalla" existe
   * justamente para poder ver todo el contenido — si un planograma tiene muchas góndolas y el
   * piso manual no alcanza para que todas entren, aplicarlo igual dejaría el encuadre
   * descentrado (la mitad izquierda del contenido recortada contra el panel de catálogo, ver
   * el bug que motivó este comentario). Solo se cuida un piso mínimo absoluto para evitar una
   * escala inválida (cero o negativa) si el contenido viniera vacío/degenerado.
   */
  const ajustarAContenido = useCallback((limite: LimiteRectangulo, paddingPx = 40, escalaMaxima = 1.4) => {
    const rect = contenedorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const anchoContenido = limite.maxX - limite.minX;
    const altoContenido = limite.maxY - limite.minY;
    const escala = Math.min(
      (rect.width - paddingPx * 2) / anchoContenido,
      (rect.height - paddingPx * 2) / altoContenido,
      escalaMaxima,
    );
    const nuevaEscala = Math.max(0.02, escala);
    setView({
      scale: nuevaEscala,
      x: (rect.width - anchoContenido * nuevaEscala) / 2 - limite.minX * nuevaEscala,
      y: (rect.height - altoContenido * nuevaEscala) / 2 - limite.minY * nuevaEscala,
    });
  }, []);

  /** Centra el lienzo sobre un punto de mundo dado, con una escala fija — usado por "buscar SKU". */
  const centrarEn = useCallback((worldX: number, worldY: number, escala = 1.1) => {
    const rect = contenedorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setView({ scale: escala, x: rect.width / 2 - worldX * escala, y: rect.height / 2 - worldY * escala });
  }, []);

  return {
    view,
    enPan,
    contenedorRef,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onWheel },
    fijarEscala,
    ajustarAContenido,
    centrarEn,
  };
}
