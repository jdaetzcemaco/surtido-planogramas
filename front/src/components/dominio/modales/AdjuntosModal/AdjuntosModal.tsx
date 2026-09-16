import { useRef, useState, type ChangeEvent } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { adjuntosService } from '../../../../services/adjuntos.service';
import { useAdjuntosDeVersion } from '../../../../hooks/useAdjuntos';
import { formatearFecha } from '../../../../utils/formatters';
import type { Adjunto } from '../../../../types/adjunto';
import type { VersionListItem } from '../../../../types/version';
import './AdjuntosModal.css';

// Mismos estados editables que valida el backend (ver adjunto.entity.js) — evita que el usuario
// dispare una subida/reemplazo/eliminación que el servidor va a rechazar con 422.
const ESTADOS_EDITABLES = ['borrador', 'en_desarrollo', 'piloto'];

const ACEPTA_ARCHIVOS = 'image/jpeg,image/png,image/webp,application/pdf';

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AdjuntosModalProps {
  version: VersionListItem;
  onClose: () => void;
}

export function AdjuntosModal({ version, onClose }: AdjuntosModalProps) {
  const { adjuntos, cargando, enviando, agregar, reemplazar, eliminar } = useAdjuntosDeVersion(version.id);
  const inputReemplazoRef = useRef<HTMLInputElement>(null);
  const [idAReemplazar, setIdAReemplazar] = useState<number | null>(null);

  const editable = ESTADOS_EDITABLES.includes(version.estado);

  async function onSeleccionarNuevo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (archivo) await agregar(archivo);
  }

  function onReemplazarClick(id: number) {
    setIdAReemplazar(id);
    inputReemplazoRef.current?.click();
  }

  async function onSeleccionarReemplazo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (archivo && idAReemplazar != null) await reemplazar(idAReemplazar, archivo);
    setIdAReemplazar(null);
  }

  async function onEliminarClick(a: Adjunto) {
    if (window.confirm(`¿Eliminar "${a.nombreOriginal}"? Esta acción no se puede deshacer.`)) {
      await eliminar(a.id);
    }
  }

  const columnas: TableColumn<Adjunto>[] = [
    { key: 'nombre', header: 'Archivo', render: (a) => a.nombreOriginal },
    { key: 'tamano', header: 'Tamaño', render: (a) => formatearTamano(a.tamanoBytes) },
    { key: 'subido', header: 'Subido', render: (a) => formatearFecha(a.createdAt) },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (a) => (
        <span className="adjuntos-modal__acciones">
          <a
            className="button button--outline"
            href={adjuntosService.urlDescarga(a.id)}
            target="_blank"
            rel="noreferrer"
          >
            Descargar
          </a>
          {editable && (
            <>
              <Button variante="outline" disabled={enviando} onClick={() => onReemplazarClick(a.id)}>
                Reemplazar
              </Button>
              <Button variante="peligro" disabled={enviando} onClick={() => onEliminarClick(a)}>
                Eliminar
              </Button>
            </>
          )}
        </span>
      ),
    },
  ];

  return (
    <Modal titulo={`Adjuntos de ${version.codigo}`} onClose={onClose} ancho="lg">
      <div className="adjuntos-modal">
        {editable ? (
          <div className="adjuntos-modal__subir">
            <label className={`button button--outline${enviando ? ' button--disabled' : ''}`}>
              {enviando ? 'Subiendo…' : '+ Añadir archivo'}
              <input type="file" accept={ACEPTA_ARCHIVOS} onChange={onSeleccionarNuevo} disabled={enviando} hidden />
            </label>
            <span className="adjuntos-modal__hint">Imágenes (JPG, PNG, WEBP) o PDF — máximo 5MB.</span>
          </div>
        ) : (
          <p className="adjuntos-modal__hint">
            Esta versión está en estado <strong>{version.estado}</strong> — no admite agregar, reemplazar ni
            eliminar adjuntos. Todavía se pueden descargar los existentes.
          </p>
        )}

        {!cargando && (
          <Table
            columns={columnas}
            rows={adjuntos}
            rowKey={(a) => a.id}
            vacio={<EmptyState titulo="Esta versión todavía no tiene adjuntos" />}
          />
        )}

        <input
          ref={inputReemplazoRef}
          type="file"
          accept={ACEPTA_ARCHIVOS}
          onChange={onSeleccionarReemplazo}
          hidden
        />
      </div>
    </Modal>
  );
}
