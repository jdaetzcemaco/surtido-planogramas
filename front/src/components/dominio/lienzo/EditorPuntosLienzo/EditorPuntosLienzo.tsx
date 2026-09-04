import { useRef } from 'react';
import type { RefObject } from 'react';
import {
  contornoCompleto,
  puntosDeLado,
  type EsquinasLienzo,
  type IntermediosLienzo,
  type LadoLienzo,
  type PuntoLienzo,
} from '../../../../utils/lienzoWarp';
import './EditorPuntosLienzo.css';

type ClaveEsquina = keyof EsquinasLienzo;

type NodoArrastrado = { tipo: 'esquina'; clave: ClaveEsquina } | { tipo: 'intermedio'; lado: LadoLienzo; indice: number };

interface EditorPuntosLienzoProps {
  imgUrl: string;
  imgRef: RefObject<HTMLImageElement | null>;
  onImagenCargada: () => void;
  dimensiones: { ancho: number; alto: number } | null;
  esquinas: EsquinasLienzo | null;
  intermedios: IntermediosLienzo;
  onCambiar: (esquinas: EsquinasLienzo, intermedios: IntermediosLienzo) => void;
}

const LADOS: LadoLienzo[] = ['top', 'right', 'bottom', 'left'];

function puntosSvg(puntos: PuntoLienzo[]): string {
  return puntos.map((p) => `${p.x},${p.y}`).join(' ');
}

export function EditorPuntosLienzo({
  imgUrl,
  imgRef,
  onImagenCargada,
  dimensiones,
  esquinas,
  intermedios,
  onCambiar,
}: EditorPuntosLienzoProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const arrastreRef = useRef<NodoArrastrado | null>(null);

  function posicionDesdeEvento(e: { clientX: number; clientY: number }): PuntoLienzo {
    const svg = svgRef.current;
    if (!svg || !dimensiones) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * dimensiones.ancho;
    const y = ((e.clientY - rect.top) / rect.height) * dimensiones.alto;
    return {
      x: Math.min(dimensiones.ancho, Math.max(0, x)),
      y: Math.min(dimensiones.alto, Math.max(0, y)),
    };
  }

  function iniciarArrastreEsquina(clave: ClaveEsquina) {
    return (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture(e.pointerId);
      arrastreRef.current = { tipo: 'esquina', clave };
    };
  }

  function iniciarArrastreIntermedio(lado: LadoLienzo, indice: number) {
    return (e: React.PointerEvent) => {
      (e.target as Element).setPointerCapture(e.pointerId);
      arrastreRef.current = { tipo: 'intermedio', lado, indice };
    };
  }

  function onPointerMoveSvg(e: React.PointerEvent) {
    const arrastre = arrastreRef.current;
    if (!arrastre || !esquinas) return;
    const punto = posicionDesdeEvento(e);
    if (arrastre.tipo === 'esquina') {
      onCambiar({ ...esquinas, [arrastre.clave]: punto }, intermedios);
    } else {
      const lista = [...intermedios[arrastre.lado]];
      lista[arrastre.indice] = punto;
      onCambiar(esquinas, { ...intermedios, [arrastre.lado]: lista });
    }
  }

  function onPointerUpSvg() {
    arrastreRef.current = null;
  }

  function agregarNodo(lado: LadoLienzo, indice: number, punto: PuntoLienzo) {
    if (!esquinas) return;
    const lista = [...intermedios[lado]];
    lista.splice(indice, 0, punto);
    onCambiar(esquinas, { ...intermedios, [lado]: lista });
  }

  function quitarNodo(lado: LadoLienzo, indice: number) {
    if (!esquinas) return;
    onCambiar(esquinas, { ...intermedios, [lado]: intermedios[lado].filter((_, i) => i !== indice) });
  }

  const dimensionMax = dimensiones ? Math.max(dimensiones.ancho, dimensiones.alto) : 0;
  const radio = Math.min(28, Math.max(8, dimensionMax * 0.012));

  return (
    <div className="editor-puntos-lienzo">
      <img ref={imgRef} src={imgUrl} alt="Imagen a delimitar" onLoad={onImagenCargada} className="editor-puntos-lienzo__imagen" />

      {dimensiones && esquinas && (
        <svg
          ref={svgRef}
          className="editor-puntos-lienzo__overlay"
          viewBox={`0 0 ${dimensiones.ancho} ${dimensiones.alto}`}
          onPointerMove={onPointerMoveSvg}
          onPointerUp={onPointerUpSvg}
          onPointerLeave={onPointerUpSvg}
        >
          <polygon points={puntosSvg(contornoCompleto(esquinas, intermedios))} className="editor-puntos-lienzo__area" />

          {LADOS.map((lado) => {
            const lista = puntosDeLado(esquinas, intermedios, lado);
            return (
              <g key={`agregar-${lado}`}>
                {lista.slice(0, -1).map((p, i) => {
                  const q = lista[i + 1];
                  const medio = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
                  return (
                    <g
                      key={i}
                      className="editor-puntos-lienzo__agregar"
                      transform={`translate(${medio.x}, ${medio.y})`}
                      onClick={() => agregarNodo(lado, i, medio)}
                    >
                      <circle r={radio * 0.6} />
                      <text dy="0.32em" style={{ fontSize: radio * 0.85 }}>
                        +
                      </text>
                      <title>Agregar nodo para deformar este lado</title>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {LADOS.map((lado) =>
            intermedios[lado].map((p, i) => (
              <circle
                key={`${lado}-${i}`}
                cx={p.x}
                cy={p.y}
                r={radio * 0.75}
                className="editor-puntos-lienzo__nodo editor-puntos-lienzo__nodo--intermedio"
                onPointerDown={iniciarArrastreIntermedio(lado, i)}
                onDoubleClick={() => quitarNodo(lado, i)}
              >
                <title>Doble clic para quitar este nodo</title>
              </circle>
            )),
          )}

          {(Object.keys(esquinas) as ClaveEsquina[]).map((clave) => (
            <circle
              key={clave}
              cx={esquinas[clave].x}
              cy={esquinas[clave].y}
              r={radio}
              className="editor-puntos-lienzo__nodo editor-puntos-lienzo__nodo--esquina"
              onPointerDown={iniciarArrastreEsquina(clave)}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
