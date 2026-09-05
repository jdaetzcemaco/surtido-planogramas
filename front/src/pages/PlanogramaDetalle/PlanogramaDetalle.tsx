import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { Breadcrumb } from '../../components/dominio/layout/Breadcrumb/Breadcrumb';
import { EstadoBadge } from '../../components/dominio/EstadoBadge/EstadoBadge';
import { SubcategoriasCard } from '../../components/dominio/detalle/SubcategoriasCard/SubcategoriasCard';
import { VersionesTable } from '../../components/dominio/detalle/VersionesTable/VersionesTable';
import { PlanogramaFormModal } from '../../components/dominio/modales/PlanogramaFormModal/PlanogramaFormModal';
import { ArchivarModal } from '../../components/dominio/modales/ArchivarModal/ArchivarModal';
import { ArchivarVersionModal } from '../../components/dominio/modales/ArchivarVersionModal/ArchivarVersionModal';
import { CrearVersionModal } from '../../components/dominio/modales/CrearVersionModal/CrearVersionModal';
import { VersionEspecialWizard } from '../../components/dominio/modales/VersionEspecialWizard/VersionEspecialWizard';
import { PromoverPilotoModal } from '../../components/dominio/modales/PromoverPilotoModal/PromoverPilotoModal';
import { PublicarVersionModal } from '../../components/dominio/modales/PublicarVersionModal/PublicarVersionModal';
import { TiendasAsignadasModal } from '../../components/dominio/modales/TiendasAsignadasModal/TiendasAsignadasModal';
import { SeleccionarVistaDisenoModal } from '../../components/dominio/modales/SeleccionarVistaDisenoModal/SeleccionarVistaDisenoModal';
import { Button } from '../../components/ui/Button/Button';
import { EmptyState } from '../../components/ui/EmptyState/EmptyState';
import { usePlanogramaDetalle } from '../../hooks/usePlanogramas';
import { useGuardarVersion, useVersionesDePlanograma } from '../../hooks/useVersiones';
import { useAuth } from '../../context/AuthContext';
import { formatearFecha } from '../../utils/formatters';
import type { VersionListItem } from '../../types/version';
import './PlanogramaDetalle.css';

export function PlanogramaDetalle() {
  const { id } = useParams<{ id: string }>();
  const idNumerico = Number(id);
  const navigate = useNavigate();
  const { puedeEscribir } = useAuth();
  const { planograma, cargando, noEncontrado, recargar } = usePlanogramaDetalle(idNumerico);
  const { versiones, cargando: cargandoVersiones, recargar: recargarVersiones } = useVersionesDePlanograma(idNumerico);
  const { guardar: marcarEnDesarrollo } = useGuardarVersion();

  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [archivarAbierto, setArchivarAbierto] = useState(false);
  const [crearVersionAbierto, setCrearVersionAbierto] = useState(false);
  const [especialWizardAbierto, setEspecialWizardAbierto] = useState(false);
  const [versionADisenar, setVersionADisenar] = useState<VersionListItem | null>(null);
  const [versionAPromover, setVersionAPromover] = useState<VersionListItem | null>(null);
  const [versionATiendas, setVersionATiendas] = useState<VersionListItem | null>(null);
  const [versionAPublicar, setVersionAPublicar] = useState<VersionListItem | null>(null);
  const [versionAArchivar, setVersionAArchivar] = useState<VersionListItem | null>(null);

  async function onMarcarEnDesarrollo(v: VersionListItem) {
    const actualizada = await marcarEnDesarrollo(v.id);
    if (actualizada) recargarVersiones();
  }

  if (noEncontrado) {
    return (
      <div className="planograma-detalle">
        <AppTopbar titulo="Planogramas" />
        <div className="planograma-detalle__contenido">
          <EmptyState
            titulo="Este planograma no existe"
            hint="Puede que haya sido eliminado o que el enlace esté mal."
            accion={<Button variante="outline" onClick={() => navigate('/planogramas')}>Volver al listado</Button>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="planograma-detalle">
      <AppTopbar
        titulo="Planogramas"
        breadcrumb={
          <Breadcrumb
            segmentos={[
              { label: 'Planogramas', to: '/planogramas' },
              { label: cargando ? '…' : (planograma?.nombre ?? '') },
            ]}
          />
        }
      />

      {!cargando && planograma && (
        <div className="planograma-detalle__contenido">
          <div className="planograma-detalle__cabecera">
            <div>
              <div className="planograma-detalle__titulo">
                <h1>{planograma.nombre}</h1>
                <EstadoBadge estado={planograma.estado} />
              </div>
              <p className="planograma-detalle__meta">
                {planograma.departamento} · creado el {formatearFecha(planograma.created_at)} por{' '}
                {planograma.created_by}
              </p>
            </div>
            {puedeEscribir && (
              <div className="planograma-detalle__acciones">
                <Button variante="outline" onClick={() => setFormularioAbierto(true)}>
                  Editar
                </Button>
                <Button
                  variante="peligro"
                  disabled={planograma.estado === 'archivado'}
                  onClick={() => setArchivarAbierto(true)}
                >
                  Archivar
                </Button>
              </div>
            )}
          </div>

          <SubcategoriasCard subcategorias={planograma.subcategorias} />

          <div className="planograma-detalle__versiones">
            <div className="planograma-detalle__versiones-cabecera">
              <h3>Versiones</h3>
              {puedeEscribir && planograma.estado !== 'archivado' && (
                <div className="planograma-detalle__acciones">
                  <Button variante="outline" onClick={() => setEspecialWizardAbierto(true)}>
                    Versión especial por tienda
                  </Button>
                  <Button onClick={() => setCrearVersionAbierto(true)}>+ Crear versión</Button>
                </div>
              )}
            </div>
            {!cargandoVersiones && (
              <VersionesTable
                planogramaId={idNumerico}
                versiones={versiones}
                puedeEscribir={puedeEscribir}
                onMarcarEnDesarrollo={onMarcarEnDesarrollo}
                onDisenar={setVersionADisenar}
                onPromoverPiloto={setVersionAPromover}
                onTiendas={setVersionATiendas}
                onPublicar={setVersionAPublicar}
                onArchivar={setVersionAArchivar}
              />
            )}
          </div>
        </div>
      )}

      {formularioAbierto && (
        <PlanogramaFormModal
          planogramaId={idNumerico}
          onClose={() => setFormularioAbierto(false)}
          onGuardado={() => {
            setFormularioAbierto(false);
            recargar();
          }}
        />
      )}

      {archivarAbierto && planograma && (
        <ArchivarModal
          planogramaId={planograma.id}
          nombre={planograma.nombre}
          onClose={() => setArchivarAbierto(false)}
          onArchivado={() => {
            setArchivarAbierto(false);
            recargar();
          }}
        />
      )}

      {crearVersionAbierto && (
        <CrearVersionModal
          planogramaId={idNumerico}
          onClose={() => setCrearVersionAbierto(false)}
          onCreada={() => {
            setCrearVersionAbierto(false);
            recargarVersiones();
          }}
        />
      )}

      {especialWizardAbierto && (
        <VersionEspecialWizard
          planogramaId={idNumerico}
          versionesBase={versiones}
          onClose={() => setEspecialWizardAbierto(false)}
          onCreada={() => {
            setEspecialWizardAbierto(false);
            recargarVersiones();
          }}
        />
      )}

      {versionADisenar && (
        <SeleccionarVistaDisenoModal
          planogramaId={idNumerico}
          version={versionADisenar}
          onClose={() => setVersionADisenar(null)}
        />
      )}

      {versionAPromover && (
        <PromoverPilotoModal
          version={versionAPromover}
          onClose={() => setVersionAPromover(null)}
          onPromovida={() => {
            setVersionAPromover(null);
            recargarVersiones();
          }}
        />
      )}

      {versionATiendas && (
        <TiendasAsignadasModal
          version={versionATiendas}
          onClose={() => setVersionATiendas(null)}
          onGuardado={() => {
            setVersionATiendas(null);
            recargarVersiones();
          }}
        />
      )}

      {versionAPublicar && (
        <PublicarVersionModal
          version={versionAPublicar}
          onClose={() => setVersionAPublicar(null)}
          onPublicada={() => {
            setVersionAPublicar(null);
            recargarVersiones();
          }}
        />
      )}

      {versionAArchivar && (
        <ArchivarVersionModal
          version={versionAArchivar}
          onClose={() => setVersionAArchivar(null)}
          onArchivada={() => {
            setVersionAArchivar(null);
            recargarVersiones();
          }}
        />
      )}
    </div>
  );
}
