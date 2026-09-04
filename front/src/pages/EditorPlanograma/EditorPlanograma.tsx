import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { Breadcrumb } from '../../components/dominio/layout/Breadcrumb/Breadcrumb';
import { GondolaTabs } from '../../components/dominio/editor/GondolaTabs/GondolaTabs';
import { GondolaModal } from '../../components/dominio/modales/GondolaModal/GondolaModal';
import { EliminarGondolaModal } from '../../components/dominio/modales/EliminarGondolaModal/EliminarGondolaModal';
import { NivelRow } from '../../components/dominio/editor/NivelRow/NivelRow';
import { BarraAccionesPosicion } from '../../components/dominio/editor/BarraAccionesPosicion/BarraAccionesPosicion';
import { NivelModal } from '../../components/dominio/modales/NivelModal/NivelModal';
import { EliminarNivelModal } from '../../components/dominio/modales/EliminarNivelModal/EliminarNivelModal';
import { BuscarSkuModal } from '../../components/dominio/modales/BuscarSkuModal/BuscarSkuModal';
import { FichaProductoModal } from '../../components/dominio/modales/FichaProductoModal/FichaProductoModal';
import { PosicionDrawer } from '../../components/dominio/modales/PosicionDrawer/PosicionDrawer';
import { MoverPosicionModal } from '../../components/dominio/modales/MoverPosicionModal/MoverPosicionModal';
import { CopiarPosicionModal } from '../../components/dominio/modales/CopiarPosicionModal/CopiarPosicionModal';
import { EliminarPosicionModal } from '../../components/dominio/modales/EliminarPosicionModal/EliminarPosicionModal';
import { AgenteExtractorBubble } from '../../components/dominio/editor/AgenteExtractorBubble/AgenteExtractorBubble';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { Button } from '../../components/ui/Button/Button';
import { usePlanogramaDetalle } from '../../hooks/usePlanogramas';
import { useVersionesDePlanograma } from '../../hooks/useVersiones';
import { useGondolasDeVersion, useReordenarGondolas } from '../../hooks/useGondolas';
import { useNivelesDeGondola, useReordenarNiveles } from '../../hooks/useNiveles';
import {
  useCopiarPosicion,
  useEditarPosicion,
  useMoverPosicion,
  usePosicionesDeNiveles,
} from '../../hooks/usePosiciones';
import { useAuth } from '../../context/AuthContext';
import { calcularAnchoAsignado } from '../../utils/posicionCalculos';
import type { DatosArrastrePosicion } from '../../utils/dragPosicion';
import type { GondolaListItem } from '../../types/gondola';
import type { Nivel } from '../../types/nivel';
import type { PosicionConProducto } from '../../types/posicion';
import './EditorPlanograma.css';

export function EditorPlanograma() {
  const { id, versionId } = useParams<{ id: string; versionId: string }>();
  const planogramaId = Number(id);
  const versionIdNumerico = Number(versionId);
  const { puedeEscribir } = useAuth();

  const { planograma, cargando: cargandoPlanograma } = usePlanogramaDetalle(planogramaId);
  const { versiones, cargando: cargandoVersiones } = useVersionesDePlanograma(planogramaId);
  const { gondolas, cargando: cargandoGondolas, recargar: recargarGondolas } = useGondolasDeVersion(versionIdNumerico);
  const { reordenar } = useReordenarGondolas();

  const version = versiones.find((v) => v.id === versionIdNumerico);

  const [activaId, setActivaId] = useState<number | null>(null);
  const [nivelesExtendido, setNivelesExtendido] = useState(false);
  const [modalGondola, setModalGondola] = useState<'crear' | GondolaListItem | null>(null);
  const [gondolaAEliminar, setGondolaAEliminar] = useState<GondolaListItem | null>(null);

  const {
    niveles,
    cargando: cargandoNiveles,
    recargar: recargarNiveles,
  } = useNivelesDeGondola(activaId ?? 0);
  const { reordenar: reordenarNiveles } = useReordenarNiveles();
  const [modalNivel, setModalNivel] = useState<'crear' | Nivel | null>(null);
  const [nivelAEliminar, setNivelAEliminar] = useState<Nivel | null>(null);
  const [mostrarBuscarSku, setMostrarBuscarSku] = useState(false);
  const [fichaSku, setFichaSku] = useState<string | null>(null);
  const [selectedPosicionId, setSelectedPosicionId] = useState<number | null>(null);
  const [clipboardPosicionId, setClipboardPosicionId] = useState<number | null>(null);
  const [posicionDetalleId, setPosicionDetalleId] = useState<number | null>(null);
  const [posicionAMover, setPosicionAMover] = useState<PosicionConProducto | null>(null);
  const [posicionACopiar, setPosicionACopiar] = useState<PosicionConProducto | null>(null);
  const [posicionAEliminar, setPosicionAEliminar] = useState<PosicionConProducto | null>(null);

  const {
    porNivel: posicionesPorNivel,
    cargando: cargandoPosiciones,
    recargar: recargarPosiciones,
  } = usePosicionesDeNiveles(niveles);
  const { editar: editarPosicion } = useEditarPosicion();
  const { copiar: copiarPosicion } = useCopiarPosicion();
  const { mover: moverPosicion } = useMoverPosicion();

  useEffect(() => {
    if (activaId !== null && gondolas.some((g) => g.id === activaId)) return;
    setActivaId(gondolas[0]?.id ?? null);
  }, [gondolas, activaId]);

  useEffect(() => {
    setSelectedPosicionId(null);
  }, [activaId]);

  function encontrarPosicion(posicionId: number): PosicionConProducto | null {
    for (const datos of Object.values(posicionesPorNivel)) {
      const encontrada = datos.posiciones.find((p) => p.id === posicionId);
      if (encontrada) return encontrada;
    }
    return null;
  }

  function nivelSiguienteId(nivelId: number): number | null {
    const indice = niveles.findIndex((n) => n.id === nivelId);
    if (indice === -1) return null;
    return niveles[indice + 1]?.id ?? niveles[indice - 1]?.id ?? null;
  }

  const selectedPosicion = selectedPosicionId !== null ? encontrarPosicion(selectedPosicionId) : null;
  const selectedNivel = selectedPosicion ? niveles.find((n) => n.id === selectedPosicion.nivelId) ?? null : null;

  async function onCambiarFacings(posicion: PosicionConProducto, nuevoFacings: number) {
    if (nuevoFacings < 1) return;
    const anchoNuevo = calcularAnchoAsignado(nuevoFacings, posicion.producto?.ancho_cm ?? null, posicion.ancho_asignado_cm);
    const resultado = await editarPosicion(posicion.id, {
      facings_horizontal: nuevoFacings,
      ancho_asignado_cm: anchoNuevo,
    });
    if (resultado) recargarPosiciones();
  }

  async function onDuplicarPosicion(posicion: PosicionConProducto) {
    const nivelDestinoId = nivelSiguienteId(posicion.nivelId);
    if (nivelDestinoId === null) return;
    const ordenDestino = (posicionesPorNivel[nivelDestinoId]?.posiciones.length ?? 0) + 1;
    const resultado = await copiarPosicion(posicion.id, nivelDestinoId, ordenDestino);
    if (resultado) recargarPosiciones();
  }

  async function onSoltarPosicion(datos: DatosArrastrePosicion, nivelDestinoId: number, ordenDestino: number) {
    const resultado = await moverPosicion(datos.posicionId, nivelDestinoId, ordenDestino);
    if (resultado) recargarPosiciones();
  }

  useEffect(() => {
    if (!puedeEscribir) return;

    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'c' || e.key === 'C') {
        if (selectedPosicionId !== null) setClipboardPosicionId(selectedPosicionId);
      } else if (e.key === 'v' || e.key === 'V') {
        if (clipboardPosicionId === null) return;
        const posicion = encontrarPosicion(clipboardPosicionId);
        if (posicion) onDuplicarPosicion(posicion);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeEscribir, selectedPosicionId, clipboardPosicionId, posicionesPorNivel, niveles]);

  async function onMover(gondola: GondolaListItem, direccion: 'subir' | 'bajar') {
    const indice = gondolas.findIndex((g) => g.id === gondola.id);
    const destino = direccion === 'subir' ? indice - 1 : indice + 1;
    if (destino < 0 || destino >= gondolas.length) return;

    const reordenadas = [...gondolas];
    [reordenadas[indice], reordenadas[destino]] = [reordenadas[destino], reordenadas[indice]];

    const orden = reordenadas.map((g, i) => ({ id: g.id, orden: i + 1 }));
    const resultado = await reordenar(versionIdNumerico, orden);
    if (resultado) recargarGondolas();
  }

  async function onMoverNivel(nivel: Nivel, direccion: 'subir' | 'bajar') {
    if (activaId === null) return;
    const indice = niveles.findIndex((n) => n.id === nivel.id);
    const destino = direccion === 'subir' ? indice - 1 : indice + 1;
    if (destino < 0 || destino >= niveles.length) return;

    const reordenados = [...niveles];
    [reordenados[indice], reordenados[destino]] = [reordenados[destino], reordenados[indice]];

    const orden = reordenados.map((n, i) => ({ id: n.id, orden: i + 1 }));
    const resultado = await reordenarNiveles(activaId, orden);
    if (resultado) recargarNiveles();
  }

  const cargandoInicial = cargandoPlanograma || cargandoVersiones;
  const gondolaActiva = gondolas.find((g) => g.id === activaId) ?? null;

  if (!cargandoInicial && (!planograma || !version)) {
    return (
      <div className="editor-planograma">
        <AppTopbar titulo="Planogramas" />
        <div className="editor-planograma__contenido">
          <EmptyState
            titulo="Esta versión no existe"
            hint="Puede que haya sido eliminada o que el enlace esté mal."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="editor-planograma">
      <AppTopbar
        titulo="Planogramas"
        breadcrumb={
          <Breadcrumb
            segmentos={[
              { label: 'Planogramas', to: '/planogramas' },
              { label: cargandoPlanograma ? '…' : (planograma?.nombre ?? ''), to: `/planogramas/${planogramaId}` },
              { label: cargandoVersiones ? '…' : (version?.codigo ?? '') },
            ]}
          />
        }
      />

      {!cargandoInicial && (
        <div className="editor-planograma__contenido">
          <div className="editor-planograma__acciones">
            <Button variante="outline" onClick={() => setMostrarBuscarSku(true)}>
              ¿Dónde está este SKU?
            </Button>
            <span className="editor-planograma__acciones-proximamente">
              <Button variante="outline" disabled title="Próximamente">
                Guardar borrador
              </Button>
              <Button variante="outline" disabled title="Próximamente">
                Historial de sustituciones
              </Button>
              <Button variante="outline" disabled title="Próximamente">
                Sustituir SKU
              </Button>
              <Button variante="outline" disabled title="Próximamente">
                Exportar
              </Button>
              <Button variante="primary" disabled title="Próximamente">
                Publicar versión
              </Button>
            </span>
          </div>

          <GondolaTabs
            gondolas={gondolas}
            activaId={activaId}
            puedeEscribir={puedeEscribir}
            onSeleccionar={setActivaId}
            onAgregar={() => setModalGondola('crear')}
            onEditar={setModalGondola}
            onEliminar={setGondolaAEliminar}
            onMover={onMover}
          />

          {!cargandoGondolas && gondolas.length === 0 && (
            <EmptyState
              titulo="Esta versión todavía no tiene góndolas"
              hint={puedeEscribir ? 'Agrega la primera góndola para empezar a armar el planograma.' : undefined}
            />
          )}

          {gondolaActiva && (
            <div
              className={`editor-planograma__gondola-activa${nivelesExtendido ? ' editor-planograma__gondola-activa--extendido' : ''}`}
            >
              {selectedPosicion && (
                <BarraAccionesPosicion
                  posicion={selectedPosicion}
                  nivelOrden={selectedNivel?.orden ?? selectedPosicion.nivelId}
                  onCambiarFacings={onCambiarFacings}
                  onDuplicar={onDuplicarPosicion}
                  onCopiar={setPosicionACopiar}
                  onMover={setPosicionAMover}
                  onEditar={(p) => setPosicionDetalleId(p.id)}
                  onFicha={setFichaSku}
                  onQuitar={setPosicionAEliminar}
                  onDeseleccionar={() => setSelectedPosicionId(null)}
                />
              )}

              <NivelRow
                niveles={niveles}
                puedeEscribir={puedeEscribir}
                extendido={nivelesExtendido}
                subcategorias={planograma?.subcategorias ?? []}
                onToggleExtender={() => setNivelesExtendido((v) => !v)}
                onAgregar={() => setModalNivel('crear')}
                onEditar={setModalNivel}
                onEliminar={setNivelAEliminar}
                onMover={onMoverNivel}
                posicionesPorNivel={posicionesPorNivel}
                cargandoPosiciones={cargandoPosiciones}
                onCambioPosiciones={recargarPosiciones}
                seleccionadaId={selectedPosicionId}
                onSeleccionarPosicion={setSelectedPosicionId}
                onDetallePosicion={(p) => setPosicionDetalleId(p.id)}
                onAbrirFicha={setFichaSku}
                onSoltarPosicion={onSoltarPosicion}
              />

              {!cargandoNiveles && niveles.length === 0 && (
                <EmptyState
                  titulo="Esta góndola todavía no tiene niveles"
                  hint={puedeEscribir ? 'Agrega el primer nivel para empezar a armar este mueble.' : undefined}
                />
              )}
            </div>
          )}
        </div>
      )}

      {modalGondola && (
        <GondolaModal
          versionId={versionIdNumerico}
          gondola={modalGondola === 'crear' ? null : modalGondola}
          onClose={() => setModalGondola(null)}
          onGuardada={(gondola) => {
            setModalGondola(null);
            recargarGondolas();
            setActivaId(gondola.id);
          }}
        />
      )}

      {gondolaAEliminar && (
        <EliminarGondolaModal
          gondola={gondolaAEliminar}
          onClose={() => setGondolaAEliminar(null)}
          onEliminada={() => {
            setGondolaAEliminar(null);
            recargarGondolas();
          }}
        />
      )}

      {modalNivel && activaId !== null && gondolaActiva && (
        <NivelModal
          gondolaId={activaId}
          gondolaAnchoCm={gondolaActiva.ancho_cm}
          nivel={modalNivel === 'crear' ? null : modalNivel}
          proximoOrden={niveles.length + 1}
          onClose={() => setModalNivel(null)}
          onGuardada={() => {
            setModalNivel(null);
            recargarNiveles();
            recargarGondolas();
            recargarPosiciones();
          }}
        />
      )}

      {nivelAEliminar && (
        <EliminarNivelModal
          nivel={nivelAEliminar}
          onClose={() => setNivelAEliminar(null)}
          onEliminado={() => {
            setNivelAEliminar(null);
            recargarNiveles();
            recargarGondolas();
          }}
        />
      )}

      {mostrarBuscarSku && (
        <BuscarSkuModal versionId={versionIdNumerico} onClose={() => setMostrarBuscarSku(false)} />
      )}

      {fichaSku && <FichaProductoModal sku={fichaSku} onClose={() => setFichaSku(null)} />}

      {posicionDetalleId !== null && (
        <PosicionDrawer
          posicionId={posicionDetalleId}
          onClose={() => setPosicionDetalleId(null)}
          onCambio={recargarPosiciones}
        />
      )}

      {posicionAMover && gondolaActiva && (
        <MoverPosicionModal
          posicion={posicionAMover}
          nivelActualId={posicionAMover.nivelId}
          gondolas={gondolas}
          gondolaActualId={gondolaActiva.id}
          onClose={() => setPosicionAMover(null)}
          onMovida={() => {
            setPosicionAMover(null);
            recargarPosiciones();
          }}
        />
      )}

      {posicionACopiar && gondolaActiva && (
        <CopiarPosicionModal
          posicion={posicionACopiar}
          nivelActualId={posicionACopiar.nivelId}
          gondolas={gondolas}
          gondolaActualId={gondolaActiva.id}
          onClose={() => setPosicionACopiar(null)}
          onCopiada={() => {
            setPosicionACopiar(null);
            recargarPosiciones();
          }}
        />
      )}

      {posicionAEliminar && (
        <EliminarPosicionModal
          posicion={posicionAEliminar}
          onClose={() => setPosicionAEliminar(null)}
          onEliminada={() => {
            setPosicionAEliminar(null);
            setSelectedPosicionId(null);
            recargarPosiciones();
          }}
        />
      )}

      {!cargandoInicial && gondolaActiva && (
        <AgenteExtractorBubble
          puedeEscribir={puedeEscribir}
          versionId={versionIdNumerico}
          gondolas={gondolas}
          gondolaActiva={gondolaActiva}
          categoria={planograma?.departamento ?? ''}
          subcategorias={planograma?.subcategorias ?? []}
          onConfirmado={() => {
            recargarNiveles();
            recargarGondolas();
            recargarPosiciones();
          }}
        />
      )}
    </div>
  );
}
