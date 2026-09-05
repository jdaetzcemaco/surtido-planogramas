import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { extractorJCv2Service } from '../../../../services/extractorJCv2.service';
import { construirCatalogoJCv2 } from '../../../../utils/construirCatalogoJCv2';
import { redimensionarImagenABase64 } from '../../../../utils/imagenRedimensionar';
import { posicionesService } from '../../../../services/posiciones.service';
import { useToast } from '../../../../context/ToastContext';
import type { GondolaListItem } from '../../../../types/gondola';
import type { Nivel } from '../../../../types/nivel';
import type { ResultadoExtraccionJCv2, ItemExtraccionJCv2 } from '../../../../types/extractorJCv2';
import type { PosicionInput, DatosVision } from '../../../../types/posicion';
import './ExtractorJCv2Modal.css';

const MAX_FOTOS = 4;
/** Umbral visual: por debajo de este valor se muestra la celda de confianza en amarillo/rojo. */
const UMBRAL_CONFIANZA_BAJA = 60;

interface ExtractorJCv2ModalProps {
  subcategorias: string[];
  gondola: GondolaListItem;
  categoria: string;
  /** Niveles de la góndola activa, ordenados de abajo hacia arriba (orden ASC). */
  nivelesDeGondola: Nivel[];
  onClose: () => void;
  /** Se llama tras insertar todas las posiciones correctamente. */
  onAceptar: () => void;
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
  sku: string | null;
  detectedName: string;
  facings: number;
  confidence: number;
  reason: string;
  esPendiente: boolean;
}

/** Construye el objeto DatosVision que se almacena en la posición, filtrando alternativas vacías. */
function itemADatosVision(item: ItemExtraccionJCv2): DatosVision {
  return {
    detectedName: item.detectedName,
    facings: item.facings,
    confidence: item.confidence,
    moduleId: item.moduleId,
    reason: item.reason,
    alternatives: (item.alternatives ?? [])
      .filter((a) => a.sku && a.sku.trim() !== '')
      .map((a) => ({ sku: a.sku, name: a.name, confidence: a.confidence })),
  };
}

/** Convierte un ítem detectado en un PosicionInput listo para la API.
 *  - Con SKU → modo PLANOGRAMA, confidence del agente, datos_vision guardado
 *  - Sin SKU → modo PENDIENTE, nombre_detectado, confidence, datos_vision
 */
function itemAPosicionInput(
  item: ItemExtraccionJCv2,
  ordenHorizontal: number,
  anchoCm: number,
): PosicionInput {
  const datosVision = itemADatosVision(item);
  const esPendiente = item.sku == null;

  return {
    sku: item.sku ?? null,
    nombre_detectado: esPendiente ? item.detectedName : null,
    confidence: item.confidence,
    datos_vision: datosVision,
    orden_horizontal: ordenHorizontal,
    ancho_asignado_cm: anchoCm,
    facings_horizontal: item.facings,
    cantidad_apilable: 1,
    unidades_por_facing: 1,
    capacidad_maxima: null,
    perfil_redondeo: 'MRP',
    modo: esPendiente ? 'PENDIENTE' : 'PLANOGRAMA',
    decision: 'ACTIVO',
  };
}

function aFilas(resultado: ResultadoExtraccionJCv2): FilaResumen[] {
  return resultado.rows.flatMap((nivel, i) =>
    nivel.items.map((item, j) => ({
      clave: `${i}-${j}-${item.sku ?? item.detectedName}`,
      nivelOrden: i + 1,
      sku: item.sku ?? null,
      detectedName: item.detectedName,
      facings: item.facings,
      confidence: item.confidence,
      reason: item.reason,
      esPendiente: item.sku == null,
    })),
  );
}

export function ExtractorJCv2Modal({
  subcategorias,
  gondola,
  categoria,
  nivelesDeGondola,
  onClose,
  onAceptar,
}: ExtractorJCv2ModalProps) {
  const [fotos, setFotos] = useState<FotoMueble[]>([]);
  const [analizando, setAnalizando] = useState(false);
  const [insertando, setInsertando] = useState(false);
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

  /** Inserta todas las posiciones detectadas directamente en la API.
   *
   *  Mapeo nivel: resultado.rows[i] → nivelesDeGondola[i] (por índice, el agente los ordena
   *  de nivel 1 = más arriba a nivel N = más abajo, igual que el orden visual del mueble).
   *  Si hay más filas que niveles registrados, las sobrantes se ignoran con aviso.
   *
   *  El ancho por item se distribuye proporcionalmente al número de facings dentro de cada nivel:
   *    anchoItem = round((nivelAncho / totalFacingsEnNivel) × item.facings)
   *  Con mínimo de 1 cm para evitar valores inválidos.
   */
  async function insertarPosiciones() {
    if (!resultado || insertando) return;
    setInsertando(true);

    let totalOk = 0;
    let totalErr = 0;

    try {
      for (let i = 0; i < resultado.rows.length; i++) {
        const nivelRow = resultado.rows[i];
        const nivel = nivelesDeGondola[i];

        if (!nivel) {
          mostrarToast(
            `Nivel ${i + 1} detectado por el agente no existe en la góndola — se omitirá.`,
            'warning',
          );
          continue;
        }

        // Calcular ancho proporcional por facing dentro de este nivel
        const totalFacings = nivelRow.items.reduce((sum, it) => sum + it.facings, 0) || 1;
        const anchoPorFacing = nivel.ancho_disponible_cm / totalFacings;

        let orden = 1;
        for (const item of nivelRow.items) {
          const anchoCm = Math.max(1, Math.round(anchoPorFacing * item.facings));
          const posicion = itemAPosicionInput(item, orden, anchoCm);
          try {
            await posicionesService.agregar(nivel.id, posicion);
            totalOk++;
            orden++;
          } catch (err) {
            totalErr++;
            console.error(`Error insertando ${item.sku ?? item.detectedName}:`, err);
          }
        }
      }

      if (totalErr > 0) {
        mostrarToast(
          `${totalOk} posición(es) creadas. ${totalErr} fallaron — revisá la consola para el detalle.`,
          'warning',
        );
      }

      onAceptar();
    } catch (err) {
      mostrarToast(
        err instanceof Error ? err.message : 'Error inesperado al insertar posiciones',
        'error',
      );
    } finally {
      setInsertando(false);
    }
  }

  const columnas: TableColumn<FilaResumen>[] = [
    { key: 'nivel', header: 'Nivel', render: (f) => f.nivelOrden },
    {
      key: 'sku',
      header: 'SKU',
      render: (f) =>
        f.esPendiente ? (
          <span className="extractor-jcv2-modal__badge-pendiente">PENDIENTE</span>
        ) : (
          f.sku
        ),
    },
    { key: 'detectado', header: 'Detectado', render: (f) => f.detectedName },
    { key: 'facings', header: 'Facings', render: (f) => f.facings },
    {
      key: 'confianza',
      header: 'Confianza',
      render: (f) => (
        <span
          className={
            'extractor-jcv2-modal__confidence' +
            (f.confidence >= UMBRAL_CONFIANZA_BAJA
              ? ' extractor-jcv2-modal__confidence--alta'
              : f.confidence >= 40
                ? ' extractor-jcv2-modal__confidence--media'
                : ' extractor-jcv2-modal__confidence--baja')
          }
        >
          {f.confidence}%
        </span>
      ),
    },
    { key: 'motivo', header: 'Motivo', render: (f) => f.reason },
  ];

  if (resultado) {
    const filas = aFilas(resultado);
    const pendientes = filas.filter((f) => f.esPendiente).length;
    const bajaConfianza = filas.filter((f) => !f.esPendiente && f.confidence < UMBRAL_CONFIANZA_BAJA).length;

    return (
      <Modal
        titulo="Resumen JC V2 — revisar antes de insertar"
        onClose={onClose}
        ancho="xl"
        footer={
          <>
            <Button variante="outline" onClick={onClose} disabled={insertando}>
              Cancelar
            </Button>
            <Button variante="primary" onClick={insertarPosiciones} disabled={insertando}>
              {insertando ? 'Insertando posiciones…' : `Insertar ${filas.length} posición(es)`}
            </Button>
          </>
        }
      >
        <div className="extractor-jcv2-modal">
          <p className="extractor-jcv2-modal__ayuda">{resultado.fixtureSummary}</p>

          {(pendientes > 0 || bajaConfianza > 0) && (
            <div className="extractor-jcv2-modal__avisos">
              {pendientes > 0 && (
                <p className="extractor-jcv2-modal__aviso extractor-jcv2-modal__aviso--pendiente">
                  📦 <strong>{pendientes}</strong> posición(es) sin match de catálogo se insertarán como{' '}
                  <strong>PENDIENTE</strong> — podrás asignar el SKU desde el editor.
                </p>
              )}
              {bajaConfianza > 0 && (
                <p className="extractor-jcv2-modal__aviso extractor-jcv2-modal__aviso--ia">
                  ⚠️ <strong>{bajaConfianza}</strong> posición(es) con confianza baja se insertarán con
                  badge <strong>IA</strong> para que las revises.
                </p>
              )}
            </div>
          )}

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
