import { useRef, useState } from 'react';
import { Button } from '../../../ui/Button/Button';
import { extractorFacingsService } from '../../../../services/extractorFacings.service';
import { redimensionarImagenABase64 } from '../../../../utils/imagenRedimensionar';
import { useToast } from '../../../../context/ToastContext';
import { mensajeDeError } from '../../../../utils/errors';
import type { RecuadroFacing } from '../../../../types/extractorFacings';
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
  const [detectando, setDetectando] = useState(false);
  // Se guardan una vez detectados y no se vuelven a pedir hasta que el usuario dispare la
  // detección de nuevo — así el zoom/paneo nunca les hace perder el recuadro a cada facing.
  const [facings, setFacings] = useState<RecuadroFacing[] | null>(null);
  const arrastreRef = useRef<{ inicioX: number; inicioY: number; offsetInicio: { x: number; y: number } } | null>(null);
  const { mostrarToast } = useToast();

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

  async function detectarProductos() {
    if (detectando) return;
    setDetectando(true);
    try {
      const { base64, mimeType } = await redimensionarImagenABase64(url, 1600);
      const respuesta = await extractorFacingsService.analizar({ imagen_base64: base64, mime_type: mimeType });
      setFacings(respuesta.facings);
      if (respuesta.advertencias.length > 0) {
        mostrarToast(respuesta.advertencias.join(' '), 'info');
      }
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo completar la detección de productos'), 'error');
    } finally {
      setDetectando(false);
    }
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
        <Button variante="primary" onClick={detectarProductos} disabled={detectando}>
          {detectando ? 'Detectando…' : 'Iniciar detección de productos'}
        </Button>
        <Button variante="outline" onClick={descargar}>
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
        <div className="vista-previa-lienzo__contenido" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${escala})` }}>
          <img src={url} alt="Imagen corregida" draggable={false} className="vista-previa-lienzo__imagen" />
          {facings && (
            <svg className="vista-previa-lienzo__facings" viewBox="0 0 1000 1000" preserveAspectRatio="none">
              {facings.map((f, i) => (
                <rect key={i} x={f.x} y={f.y} width={f.ancho} height={f.alto} />
              ))}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
