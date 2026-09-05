import { Link } from 'react-router-dom';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { EstadoBadge } from '../../EstadoBadge/EstadoBadge';
import type { VersionListItem } from '../../../../types/version';
import './VersionesTable.css';

interface VersionesTableProps {
  planogramaId: number;
  versiones: VersionListItem[];
  puedeEscribir: boolean;
  onMarcarEnDesarrollo: (v: VersionListItem) => void;
  onPromoverPiloto: (v: VersionListItem) => void;
  onTiendas: (v: VersionListItem) => void;
  onPublicar: (v: VersionListItem) => void;
  onArchivar: (v: VersionListItem) => void;
  /** Abre el modal de "¿Editor o Lienzo?" — reemplaza la navegación directa que tenía antes el enlace "Diseñar". */
  onDisenar: (v: VersionListItem) => void;
}

export function VersionesTable({
  planogramaId,
  versiones,
  puedeEscribir,
  onMarcarEnDesarrollo,
  onPromoverPiloto,
  onTiendas,
  onPublicar,
  onArchivar,
  onDisenar,
}: VersionesTableProps) {
  const columnas: TableColumn<VersionListItem>[] = [
    {
      key: 'codigo',
      header: 'Código',
      render: (v) => (
        <Link className="mono versiones-table__codigo" to={`/planogramas/${planogramaId}/versiones/${v.id}/editor`}>
          {v.codigo}
        </Link>
      ),
    },
    { key: 'tipo', header: 'Tipo', render: (v) => v.tipo },
    { key: 'estado', header: 'Estado', render: (v) => <EstadoBadge estado={v.estado} /> },
    { key: 'gondolas', header: 'Góndolas', render: (v) => v.totalGondolas },
    { key: 'tiendas', header: 'Tiendas', render: (v) => v.tiendas.length },
  ];

  if (puedeEscribir) {
    columnas.push({
      key: 'acciones',
      header: 'Acciones',
      render: (v) => (
        <span className="versiones-table__acciones">
          <button type="button" onClick={() => onDisenar(v)}>
            Diseñar
          </button>
          {v.estado === 'borrador' && (
            <button type="button" onClick={() => onMarcarEnDesarrollo(v)}>
              Marcar en desarrollo
            </button>
          )}
          {v.estado === 'en_desarrollo' && (
            <button type="button" onClick={() => onPromoverPiloto(v)}>
              Promover a piloto
            </button>
          )}
          {v.estado === 'piloto' && (
            <>
              <button type="button" onClick={() => onTiendas(v)}>
                Tiendas piloto
              </button>
              <button type="button" onClick={() => onPublicar(v)}>
                Publicar
              </button>
            </>
          )}
          {v.estado === 'publicado' && (
            <button type="button" onClick={() => onTiendas(v)}>
              Tiendas asignadas
            </button>
          )}
          {v.estado !== 'publicado' && (
            <button type="button" className="versiones-table__accion-peligro" onClick={() => onArchivar(v)}>
              Archivar
            </button>
          )}
        </span>
      ),
    });
  }

  return (
    <Table
      columns={columnas}
      rows={versiones}
      rowKey={(v) => v.id}
      vacio={<EmptyState titulo="Este planograma todavía no tiene versiones" />}
    />
  );
}
