import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { RevisionExtraccionJCv2 } from './RevisionExtraccionJCv2';
import { extractorJCv2Service } from '../../../../services/extractorJCv2.service';
import { construirCatalogoJCv2 } from '../../../../utils/construirCatalogoJCv2';
import { redimensionarImagenABase64 } from '../../../../utils/imagenRedimensionar';
import { useToast } from '../../../../context/ToastContext';
import type { GondolaListItem } from '../../../../types/gondola';
import type { ResultadoExtraccionJCv2 } from '../../../../types/extractorJCv2';
import './ExtractorJCv2Modal.css';

const MAX_FOTOS = 4;

interface ExtractorJCv2ModalProps {
  subcategorias: string[];
  /** Todas las góndolas de la versión — para mostrar el selector. */
  gondolas: GondolaListItem[];
  versionId: number;
  /** Góndola activa — usada como referencia de fixture para el análisis IA. */
  gondola: GondolaListItem;
  categoria: string;
  onClose: () => void;
  onAceptar: () => void;
}

interface FotoMueble {
  id: string;
  label: string;
  archivo: File;
  previewUrl: string;
}

export function ExtractorJCv2Modal({
  subcategorias,
  gondolas,
  versionId,
  gondola,
  categoria,
  onClose,
  onAceptar,
}: ExtractorJCv2ModalProps) {
  const [fotos, setFotos] = useState<FotoMueble[]>([]);
  const [analizando, setAnalizando] = useState(false);
  const [faseTexto, setFaseTexto] = useState('');
  const [resultado, setResultado] = useState<ResultadoExtraccionJCv2 | null>(null);
  const { mostrarToast } = useToast();

  // ── foto handlers ────────────────────────────────────────────────────────

  function onAgregarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!archivo || fotos.length >= MAX_FOTOS) return;
    setFotos((actual) => [
      ...actual,
      {
        id: `foto-${actual.length + 1}`,
        label: `Foto ${actual.length + 1}`,
        archivo,
        previewUrl: URL.createObjectURL(archivo),
      },
    ]);
  }

  function onQuitarFoto(id: string) {
    setFotos((actual) => actual.filter((f) => f.id !== id));
  }

  function onCambiarEtiqueta(id: string, label: string) {
    setFotos((actual) => actual.map((f) => (f.id === id ? { ...f, label } : f)));
  }

  // ── análisis ─────────────────────────────────────────────────────────────

  async function ejecutar() {
    if (fotos.length === 0 || analizando) return;
    if (subcategorias.length === 0) {
      mostrarToast(
        'Este planograma no tiene subcategorías asignadas — no hay catálogo contra qué comparar las fotos.',
        'error',
      );
      return;
    }

    setAnalizando(true);
    try {
      setFaseTexto(`Recolectando catálogo con imágenes de ${subcategorias.length} subcategoría(s)…`);
      const catalog = await construirCatalogoJCv2(subcategorias);
      if (catalog.length === 0) {
        mostrarToast(
          'No se encontraron productos en el catálogo para las subcategorías de este planograma.',
          'error',
        );
        return;
      }

      setFaseTexto('Analizando fotos con el agente JC V2…');
      const photos = await Promise.all(
        fotos.map(async (foto) => {
          const { base64, mimeType } = await redimensionarImagenABase64(foto.archivo);
          return { id: foto.id, label: foto.label, dataUrl: `data:${mimeType};base64,${base64}` };
        }),
      );

      const respuesta = await extractorJCv2Service.analizar({
        store: 'Cemaco',
        category: categoria,
        fixture: {
          name: gondola.nombre,
          width: gondola.ancho_cm,
          levels: gondola.totalNiveles,
          depth: gondola.profundidad_cm,
        },
        photos,
        catalog,
      });

      if (respuesta.error) {
        mostrarToast(respuesta.error, 'error');
        return;
      }
      setResultado(respuesta);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo completar la extracción JC V2';
      mostrarToast(msg, 'error');
    } finally {
      setAnalizando(false);
      setFaseTexto('');
    }
  }

  if (resultado) {
    return (
      <RevisionExtraccionJCv2
        resultado={resultado}
        gondolas={gondolas}
        versionId={versionId}
        gondolaReferencia={gondola}
        onClose={onClose}
        onAceptar={onAceptar}
      />
    );
  }

  // ── render: fotos (fase inicial) ─────────────────────────────────────────

  return (
    <Modal
      titulo="JC V2 — Extracción por fotos"
      onClose={onClose}
      ancho="md"
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={analizando}>
            Cancelar
          </Button>
          <Button
            variante="primary"
            onClick={ejecutar}
            disabled={fotos.length === 0 || analizando}
          >
            {analizando ? faseTexto || 'Analizando…' : 'Analizar fotos'}
          </Button>
        </>
      }
    >
      <div className="extractor-jcv2-modal">
        <p className="extractor-jcv2-modal__ayuda">
          Subí hasta {MAX_FOTOS} fotos del mueble. El agente compara visualmente cada producto
          contra las imágenes de referencia del catálogo Cemaco. Los resultados se insertan
          directamente — SKUs confirmados como posiciones normales, sin match como{' '}
          <strong>PENDIENTE</strong> para asignar desde el editor.
        </p>

        <div className="extractor-jcv2-modal__fotos">
          {fotos.map((foto) => (
            <div key={foto.id} className="extractor-jcv2-modal__foto">
              <img
                src={foto.previewUrl}
                alt={foto.label}
                className="extractor-jcv2-modal__preview"
              />
              <input
                type="text"
                value={foto.label}
                onChange={(e) => onCambiarEtiqueta(foto.id, e.target.value)}
                disabled={analizando}
                aria-label={`Etiqueta de ${foto.label}`}
              />
              <Button
                variante="outline"
                onClick={() => onQuitarFoto(foto.id)}
                disabled={analizando}
              >
                Quitar
              </Button>
            </div>
          ))}
        </div>

        {fotos.length < MAX_FOTOS && (
          <input type="file" accept="image/*" onChange={onAgregarFoto} disabled={analizando} />
        )}
      </div>
    </Modal>
  );
}
