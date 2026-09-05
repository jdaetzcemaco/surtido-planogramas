import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { extractorJCv2Service } from '../../../../services/extractorJCv2.service';
import { construirCatalogoJCv2 } from '../../../../utils/construirCatalogoJCv2';
import { redimensionarImagenABase64 } from '../../../../utils/imagenRedimensionar';
import { posicionesService } from '../../../../services/posiciones.service';
import { gondolasService } from '../../../../services/gondolas.service';
import { nivelesService } from '../../../../services/niveles.service';
import { useToast } from '../../../../context/ToastContext';
import type { GondolaListItem } from '../../../../types/gondola';
import type { Nivel } from '../../../../types/nivel';
import type { ResultadoExtraccionJCv2, ItemExtraccionJCv2 } from '../../../../types/extractorJCv2';
import type { PosicionInput, DatosVision } from '../../../../types/posicion';
import './ExtractorJCv2Modal.css';

const MAX_FOTOS = 4;
/** Umbral visual: por debajo de este valor se muestra la celda de confianza en amarillo/rojo. */
const UMBRAL_CONFIANZA_BAJA = 60;

type Fase = 'fotos' | 'seleccion-gondola' | 'resumen';

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

interface FormNuevaGondola {
  nombre: string;
  ancho_cm: string;
  alto_cm: string;
  profundidad_cm: string;
}

// ── helpers puros ────────────────────────────────────────────────────────────

/** Carga los niveles de la góndola y crea los faltantes hasta llegar a `cantNiveles`. */
async function asegurarNiveles(
  gondolaTarget: GondolaListItem,
  cantNiveles: number,
): Promise<Nivel[]> {
  const existentes = await nivelesService.listarPorGondola(gondolaTarget.id);
  const ordenados = [...existentes].sort((a, b) => a.orden - b.orden);

  const faltantes = cantNiveles - ordenados.length;
  if (faltantes <= 0) return ordenados.slice(0, cantNiveles);

  const creados: Nivel[] = [];
  const baseOrden = ordenados.length;
  for (let i = 0; i < faltantes; i++) {
    const orden = baseOrden + i + 1;
    // Distribuir altura desde piso de forma proporcional dentro del alto de la góndola
    const altura = Math.max(1, Math.round((gondolaTarget.alto_cm * orden) / cantNiveles));
    const nivel = await nivelesService.agregar(gondolaTarget.id, {
      orden,
      altura_desde_piso_cm: altura,
      tipo_accesorio: 'BANDEJA',
      ancho_disponible_cm: gondolaTarget.ancho_cm,
    });
    creados.push(nivel);
  }

  return [...ordenados, ...creados].sort((a, b) => a.orden - b.orden);
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

// ── componente ───────────────────────────────────────────────────────────────

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
  const [insertando, setInsertando] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [faseTexto, setFaseTexto] = useState('');
  const [resultado, setResultado] = useState<ResultadoExtraccionJCv2 | null>(null);
  const [fase, setFase] = useState<Fase>('fotos');
  const [gondolaTarget, setGondolaTarget] = useState<GondolaListItem | null>(null);
  const [nivelesTarget, setNivelesTarget] = useState<Nivel[]>([]);
  const [mostrarFormNueva, setMostrarFormNueva] = useState(false);
  const [formNueva, setFormNueva] = useState<FormNuevaGondola>({
    nombre: '',
    ancho_cm: String(gondola.ancho_cm),
    alto_cm: String(gondola.alto_cm),
    profundidad_cm: String(gondola.profundidad_cm),
  });
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
      setFase('seleccion-gondola');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo completar la extracción JC V2';
      mostrarToast(msg, 'error');
    } finally {
      setAnalizando(false);
      setFaseTexto('');
    }
  }

  // ── selección de góndola ─────────────────────────────────────────────────

  async function seleccionarGondola(g: GondolaListItem) {
    if (!resultado || preparando) return;
    setPreparando(true);
    try {
      const niveles = await asegurarNiveles(g, resultado.rows.length);
      setGondolaTarget(g);
      setNivelesTarget(niveles);
      setFase('resumen');
    } catch (err) {
      mostrarToast(
        err instanceof Error ? err.message : 'Error preparando los niveles de la góndola',
        'error',
      );
    } finally {
      setPreparando(false);
    }
  }

  async function crearYSeleccionar() {
    if (!resultado || preparando) return;
    const nombre = formNueva.nombre.trim();
    if (!nombre) { mostrarToast('El nombre de la góndola es obligatorio.', 'error'); return; }
    const ancho = parseFloat(formNueva.ancho_cm);
    const alto = parseFloat(formNueva.alto_cm);
    const profundidad = parseFloat(formNueva.profundidad_cm);
    if ([ancho, alto, profundidad].some((v) => isNaN(v) || v <= 0)) {
      mostrarToast('Las dimensiones deben ser números positivos.', 'error');
      return;
    }

    setPreparando(true);
    try {
      const nuevaGondola = await gondolasService.agregar(versionId, {
        nombre,
        ancho_cm: ancho,
        alto_cm: alto,
        profundidad_cm: profundidad,
      });
      const gItem: GondolaListItem = { ...nuevaGondola, totalNiveles: 0 };
      const niveles = await asegurarNiveles(gItem, resultado.rows.length);
      setGondolaTarget(gItem);
      setNivelesTarget(niveles);
      setFase('resumen');
    } catch (err) {
      mostrarToast(
        err instanceof Error ? err.message : 'Error creando la nueva góndola',
        'error',
      );
    } finally {
      setPreparando(false);
    }
  }

  // ── inserción ────────────────────────────────────────────────────────────

  async function insertarPosiciones() {
    if (!resultado || !gondolaTarget || insertando) return;
    setInsertando(true);
    let totalOk = 0;
    let totalErr = 0;

    try {
      for (let i = 0; i < resultado.rows.length; i++) {
        const nivelRow = resultado.rows[i];
        const nivel = nivelesTarget[i];
        if (!nivel) { console.warn(`Nivel ${i + 1} sin correspondencia — se omite.`); continue; }

        const totalFacings = nivelRow.items.reduce((sum, it) => sum + it.facings, 0) || 1;
        const anchoPorFacing = nivel.ancho_disponible_cm / totalFacings;

        let orden = 1;
        for (const item of nivelRow.items) {
          const anchoCm = Math.max(1, Math.round(anchoPorFacing * item.facings));
          try {
            await posicionesService.agregar(nivel.id, itemAPosicionInput(item, orden, anchoCm));
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
      mostrarToast(err instanceof Error ? err.message : 'Error inesperado al insertar posiciones', 'error');
    } finally {
      setInsertando(false);
    }
  }

  // ── columnas tabla ───────────────────────────────────────────────────────

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

  // ── render: selección de góndola ─────────────────────────────────────────

  if (fase === 'seleccion-gondola' && resultado) {
    return (
      <Modal
        titulo="¿En qué góndola querés insertar?"
        onClose={onClose}
        ancho="md"
        footer={
          <Button variante="outline" onClick={onClose} disabled={preparando}>
            Cancelar
          </Button>
        }
      >
        <div className="extractor-jcv2-modal">
          <p className="extractor-jcv2-modal__ayuda">
            El agente detectó <strong>{resultado.rows.length} nivel(es)</strong>. Seleccioná la
            góndola donde se insertarán. Si le faltan niveles, se crearán automáticamente.
          </p>

          <div className="extractor-jcv2-modal__gondolas">
            {gondolas.map((g) => (
              <div key={g.id} className="extractor-jcv2-modal__gondola-card">
                <div className="extractor-jcv2-modal__gondola-info">
                  <strong>{g.nombre}</strong>
                  <span className="extractor-jcv2-modal__gondola-meta">
                    {g.ancho_cm} cm × {g.alto_cm} cm — {g.totalNiveles} nivel(es)
                  </span>
                </div>
                <Button
                  variante="primary"
                  onClick={() => seleccionarGondola(g)}
                  disabled={preparando}
                >
                  {preparando ? 'Preparando…' : 'Seleccionar'}
                </Button>
              </div>
            ))}
          </div>

          <div className="extractor-jcv2-modal__separador">
            <button
              type="button"
              className="extractor-jcv2-modal__toggle-nueva"
              onClick={() => setMostrarFormNueva((v) => !v)}
              disabled={preparando}
            >
              {mostrarFormNueva ? '▲ Cancelar nueva góndola' : '＋ Crear nueva góndola'}
            </button>
          </div>

          {mostrarFormNueva && (
            <div className="extractor-jcv2-modal__form-nueva">
              <label className="extractor-jcv2-modal__label">
                Nombre
                <input
                  type="text"
                  value={formNueva.nombre}
                  onChange={(e) => setFormNueva((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Nombre de la góndola"
                  disabled={preparando}
                />
              </label>
              <div className="extractor-jcv2-modal__form-dims">
                <label className="extractor-jcv2-modal__label">
                  Ancho (cm)
                  <input
                    type="number"
                    value={formNueva.ancho_cm}
                    onChange={(e) => setFormNueva((f) => ({ ...f, ancho_cm: e.target.value }))}
                    min={1}
                    disabled={preparando}
                  />
                </label>
                <label className="extractor-jcv2-modal__label">
                  Alto (cm)
                  <input
                    type="number"
                    value={formNueva.alto_cm}
                    onChange={(e) => setFormNueva((f) => ({ ...f, alto_cm: e.target.value }))}
                    min={1}
                    disabled={preparando}
                  />
                </label>
                <label className="extractor-jcv2-modal__label">
                  Profundidad (cm)
                  <input
                    type="number"
                    value={formNueva.profundidad_cm}
                    onChange={(e) => setFormNueva((f) => ({ ...f, profundidad_cm: e.target.value }))}
                    min={1}
                    disabled={preparando}
                  />
                </label>
              </div>
              <Button variante="primary" onClick={crearYSeleccionar} disabled={preparando}>
                {preparando ? 'Creando…' : 'Crear y seleccionar'}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    );
  }

  // ── render: resumen ───────────────────────────────────────────────────────

  if (fase === 'resumen' && resultado && gondolaTarget) {
    const filas = aFilas(resultado);
    const pendientes = filas.filter((f) => f.esPendiente).length;
    const bajaConfianza = filas.filter((f) => !f.esPendiente && f.confidence < UMBRAL_CONFIANZA_BAJA).length;

    return (
      <Modal
        titulo={`Resumen JC V2 — ${gondolaTarget.nombre}`}
        onClose={onClose}
        ancho="xl"
        footer={
          <>
            <Button variante="outline" onClick={() => setFase('seleccion-gondola')} disabled={insertando}>
              ← Cambiar góndola
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
