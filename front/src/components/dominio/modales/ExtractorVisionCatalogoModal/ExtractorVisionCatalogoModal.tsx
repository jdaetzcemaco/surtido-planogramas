import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { extractorVisionCatalogoService } from '../../../../services/extractorVisionCatalogo.service';
import { construirCatalogoVision } from '../../../../utils/construirCatalogoVision';
import { redimensionarImagenABase64 } from '../../../../utils/imagenRedimensionar';
import { useToast } from '../../../../context/ToastContext';
import { mensajeDeError } from '../../../../utils/errors';
import type { GondolaListItem } from '../../../../types/gondola';
import type { ResultadoExtraccionVision } from '../../../../types/extractorVisionCatalogo';
import './ExtractorVisionCatalogoModal.css';

const MAX_FOTOS = 4;

interface ExtractorVisionCatalogoModalProps {
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

interface FilaResumenVision {
  clave: string;
  nivelOrden: number;
  sku: string;
  detectedName: string;
  facings: number;
  confidence: number;
  reason: string;
}

/** Construye el mensaje de texto que se manda al chat del Agente Extractor — mismo criterio que
 * `construirMensajeDesdeExtraccion` en ExtractorImagenNumeradaModal, pero acá la confianza es
 * central (es match visual contra catálogo, no lectura de texto impreso): los items de baja
 * confianza se marcan explícitamente en vez de pedirle al agente que los agregue a ciegas. */
function construirMensajeDesdeVision(resultado: ResultadoExtraccionVision): string {
  const UMBRAL_ALTERNATIVAS = 70;

  const lineas = resultado.rows.flatMap((nivel, i) =>
    nivel.items.map((item) => {
      const nivelOrden = i + 1;
      const skuTexto = item.sku ? `SKU ${item.sku}` : `sin match de catálogo (detectado: "${item.detectedName}")`;
      const facingsTexto = item.facings === 1 ? 'facing horizontal' : 'facings horizontales';
      const base = `- Nivel ${nivelOrden}: ${skuTexto}, ${item.facings} ${facingsTexto}, confianza ${item.confidence}% (${item.reason}).`;

      if (item.confidence < UMBRAL_ALTERNATIVAS && item.alternatives.length > 0) {
        const alternativasTexto = item.alternatives
          .map((alt) => `${alt.sku} - ${alt.name} (${alt.confidence}%)`)
          .join('; ');
        return `${base} Alternativas: ${alternativasTexto}.`;
      }
      return base;
    }),
  );

  return [
    `Extraje estos productos de ${resultado.rows.length} nivel(es) visibles en fotos del mueble (${resultado.fixtureSummary}):`,
    lineas.join('\n'),
    '',
    'Agrega solo los que tengan SKU y confianza razonable; para los de baja confianza o sin match, preguntame qué preferís antes de agregarlos.',
  ].join('\n');
}

function aFilas(resultado: ResultadoExtraccionVision): FilaResumenVision[] {
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

export function ExtractorVisionCatalogoModal({
  subcategorias,
  gondola,
  categoria,
  onClose,
  onAceptar,
}: ExtractorVisionCatalogoModalProps) {
  const [fotos, setFotos] = useState<FotoMueble[]>([]);
  const [analizando, setAnalizando] = useState(false);
  const [faseTexto, setFaseTexto] = useState('');
  const [resultado, setResultado] = useState<ResultadoExtraccionVision | null>(null);
  const { mostrarToast } = useToast();

  function onAgregarFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!archivo || fotos.length >= MAX_FOTOS) return;
    setFotos((actual) => [
      ...actual,
      { id: `foto-${actual.length + 1}`, label: `Foto ${actual.length + 1}`, archivo, previewUrl: URL.createObjectURL(archivo) },
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
      mostrarToast('Este planograma no tiene subcategorías asignadas — no hay catálogo contra qué comparar las fotos.', 'error');
      return;
    }
    setAnalizando(true);
    try {
      setFaseTexto(`Recolectando catálogo de ${subcategorias.length} subcategoría(s)…`);
      const catalog = await construirCatalogoVision(subcategorias);
      if (catalog.length === 0) {
        mostrarToast('No se encontraron productos en el catálogo para las subcategorías de este planograma.', 'error');
        return;
      }

      setFaseTexto('Analizando fotos con el agente de visión…');
      const photos = await Promise.all(
        fotos.map(async (foto) => {
          const { base64, mimeType } = await redimensionarImagenABase64(foto.archivo);
          return { id: foto.id, label: foto.label, dataUrl: `data:${mimeType};base64,${base64}` };
        }),
      );

      const respuesta = await extractorVisionCatalogoService.analizar({
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
      mostrarToast(mensajeDeError(err, 'No se pudo completar la extracción visual'), 'error');
    } finally {
      setAnalizando(false);
      setFaseTexto('');
    }
  }

  const columnas: TableColumn<FilaResumenVision>[] = [
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
        titulo="Resumen de la extracción visual"
        onClose={onClose}
        ancho="xl"
        footer={
          <>
            <Button variante="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button variante="primary" onClick={() => onAceptar(construirMensajeDesdeVision(resultado))}>
              Aceptar
            </Button>
          </>
        }
      >
        <div className="extractor-vision-catalogo-modal">
          <p className="extractor-vision-catalogo-modal__ayuda">{resultado.fixtureSummary}</p>
          <Table<FilaResumenVision>
            columns={columnas}
            rows={filas}
            rowKey={(f) => f.clave}
            vacio={<p className="extractor-vision-catalogo-modal__ayuda">No se detectó ningún producto en las fotos.</p>}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      titulo="Fotos del mueble (IA visual)"
      onClose={onClose}
      ancho="md"
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={analizando}>
            Cancelar
          </Button>
          <Button variante="primary" onClick={ejecutar} disabled={fotos.length === 0 || analizando}>
            {analizando ? faseTexto || 'Analizando…' : 'Analizar fotos'}
          </Button>
        </>
      }
    >
      <div className="extractor-vision-catalogo-modal">
        <p className="extractor-vision-catalogo-modal__ayuda">
          Subí hasta {MAX_FOTOS} fotos del mueble tal cual está en la tienda. El agente compara lo
          que ve contra el catálogo de las subcategorías de este planograma — no hace falta que se
          vean SKUs ni números de gancho.
        </p>

        <div className="extractor-vision-catalogo-modal__fotos">
          {fotos.map((foto) => (
            <div key={foto.id} className="extractor-vision-catalogo-modal__foto">
              <img src={foto.previewUrl} alt={foto.label} className="extractor-vision-catalogo-modal__preview" />
              <input
                type="text"
                value={foto.label}
                onChange={(e) => onCambiarEtiqueta(foto.id, e.target.value)}
                disabled={analizando}
                aria-label={`Etiqueta de ${foto.label}`}
              />
              <Button variante="outline" onClick={() => onQuitarFoto(foto.id)} disabled={analizando}>
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
