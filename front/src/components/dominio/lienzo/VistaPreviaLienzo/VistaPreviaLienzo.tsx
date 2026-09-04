import { useRef, useState } from 'react';
import { Button } from '../../../ui/Button/Button';
import './VistaPreviaLienzo.css';

interface VistaPreviaLienzoProps {
  url: string;
  onCerrar: () => void;
}

const ESCALA_MIN = 0.5;
const ESCALA_MAX = 6;

function acotarEscala(valor: number): number {
  return Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, valor));
}

export function VistaPreviaLienzo({ url, onCerrar }: VistaPreviaLienzoProps) {
  const [escala, setEscala] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const arrastreRef = useRef<{ inicioX: number; inicioY: number; offsetInicio: { x: number; y: number } } | null>(null);

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setEscala((actual) => acotarEscala(actual * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastreRef.current = { inicioX: e.clientX, inicioY: e.clientY, offsetInicio: offset };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!arrastreRef.current) return;
    const { inicioX, inicioY, offsetInicio } = arrastreRef.current;
    setOffset({ x: offsetInicio.x + (e.clientX - inicioX), y: offsetInicio.y + (e.clientY - inicioY) });
  }

  function onPointerUp() {
    arrastreRef.current = null;
  }

  function restablecer() {
    setEscala(1);
    setOffset({ x: 0, y: 0 });
  }

  function descargar() {
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'lienzo-corregido.png';
    enlace.click();
  }

  return (
    <div className="vista-previa-lienzo">
      <div className="vista-previa-lienzo__barra">
        <Button variante="outline" onClick={() => setEscala((s) => acotarEscala(s / 1.2))}>
          −
        </Button>
        <Button variante="outline" onClick={restablecer}>
          Restablecer
        </Button>
        <Button variante="outline" onClick={() => setEscala((s) => acotarEscala(s * 1.2))}>
          +
        </Button>
        <span className="vista-previa-lienzo__espaciador" />
        <Button variante="primary" onClick={descargar}>
          Descargar
        </Button>
        <Button variante="outline" onClick={onCerrar}>
          Cerrar
        </Button>
      </div>
      <div
        className="vista-previa-lienzo__lienzo"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <img
          src={url}
          alt="Imagen corregida"
          draggable={false}
          className="vista-previa-lienzo__imagen"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${escala})` }}
        />
      </div>
    </div>
  );
}
