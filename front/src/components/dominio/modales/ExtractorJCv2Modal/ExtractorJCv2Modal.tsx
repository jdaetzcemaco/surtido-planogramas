import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { extractorJCv2Service } from '../../../../services/extractorJCv2.service';
import { construirCatalogoJCv2 } from '../../../../utils/construirCatalogoJCv2';
import { redimensionarImagenABase64 } from '../../../../utils/imagenRedimensionar';
import { useToast } from '../../../../context/ToastContext';
import type { GondolaListItem } from '../../../../types/gondola';
import type { ResultadoExtraccionJCv2 } from '../../../../types/extractorJCv2';
import type { ResultadoExtraccionVision } from '../../../../types/extractorVisionCatalogo';
import './ExtractorJCv2Modal.css';

const MAX_FOTOS = 4;

interface ExtractorJCv2ModalProps {
  subcategorias: string[];
  gondola: GondolaListItem;
  categoria: string;
  onClose: () => void;
  onAceptar: (mensaje: string) => void;
}

interface FotoMueble {
  id: string;
  label: string;
  archivo: File;
  previewUrl: string;
}

interface FilaResumen {
  clave: string;
  nivelOrden: number;
  sku: string;
  detectedName: string;
  facings: number;
  confidence: number;
  reason: string;
}

const UMBRAL_ALTERNATIVAS = 70;

function construirMensaje(resultado: ResultadoExtraccionJCv2): string {
  const lineas = resultado.rows.flatMap((nivel, i) =>
    nivel.items.map((item) => {
      const nivelOrden = i + 1;
      const skuTexto = item.sku
        ? `SKU ${item.sku}`
        : `sin match de catálogo (detectado: "${item.detectedName}")`;
      const facingsTexto = item.facings === 1 ? 'facing horizontal' : 'facings horizontales';
      const base = `- Nivel ${nivelOrden}: ${skuTexto}, ${item.facings} ${facingsTexto}, confianza ${item.confidence}% (${item.reason}).`;

      if (item.confidence < UMBRAL_ALTERNATIVAS && item.alternatives.length > 0) {
        const alts = item.alternatives
          .map((a) => `${a.sku} - ${a.name} (${a.confidence}%)`)
          .join('; ');
        return `${base} Alternativas: ${alts}.`;
      }
      return base;
    }),
  );

  return [
    `Extraje estos productos de ${resultado.rows.length} nivel(es) usando JC V2 (${resultado.fixtureSummary}):`,
    lineas.join('\n'),
    '',
    'Agrega solo los que tengan SKU y confianza razonable; para los de baja confianza o sin match, preguntame qué preferís antes de agregarlos.',
  ].join('\n');
}

function aFilas(resultado: ResultadoExtraccionVision): FilaResumen[] {
  return resultado.rows.flatMap((nivel, i) =>
    nivel.items.map((item, j) => ({
      clave: `${i}-${j}-${item.sku ?? item.detectedName}`,
      nivelOrden: i + 1,
      sku: item.sku ?? '—',
      detectedName: item.detectedName,
      facings: item.facings,
      confidence: item.confidence,
      reason: item.reason,
    })),
  );
}

export function ExtractorJCv2Modal({
  subcategorias,
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

  const columnas: TableColumn<FilaResumen>[] = [
    { key: 'nivel', header: 'Nivel', render: (f) => f.nivelOrden },
    { key: 'sku', header: 'SKU', render: (f) => f.sku },
    { key: 'detectado', header: 'Detectado', render: (f) => f.detectedName },
    { key: 'facings', header: 'Facings', render: (f) => f.facings },
    { key: 'confianza', header: 'Confianza', render: (f) => `${f.confidence}%` },
    { key: 'motivo', header: 'Motivo', render: (f) => f.reason },
  ];

  if (resultado) {
    const filas = aFilas(resultado);
    return (
      <Modal
        titulo="Resumen JC V2"
        onClose={onClose}
        ancho="xl"
        footer={
          <>
            <Button variante="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button variante="primary" onClick={() => onAceptar(construirMensaje(resultado))}>
              Aceptar
            </Button>
          </>
        }
      >
        <div className="extractor-jcv2-modal">
          <p className="extractor-jcv2-modal__ayuda">{resultado.fixtureSummary}</p>
          <Table<FilaResumen>
            columns={columnas}
            rows={filas}
            rowKey={(f) => f.clave}
            vacio={
              <p className="extractor-jcv2-modal__ayuda">
                No se detectó ningún producto en las fotos.
              </p>
            }
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      titulo="JC V2"
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
          Subí hasta {MAX_FOTOS} fotos del mueble. El agente compara visualmente lo que ve en cada
          foto contra las imágenes de referencia del catálogo Cemaco — una coincidencia visual
          directa producto a producto, sin necesitar SKUs ni números visibles.
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
