import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../ui/Modal/Modal';
import type { VersionListItem } from '../../../../types/version';
import './SeleccionarVistaDisenoModal.css';

interface SeleccionarVistaDisenoModalProps {
  planogramaId: number;
  version: VersionListItem;
  onClose: () => void;
}

/**
 * Al entrar a "Diseñar" una versión, el analista elige entre las dos formas de armar el
 * planograma: el Editor de siempre (lista de niveles/posiciones) o el Lienzo (canvas con
 * góndolas arrastrables, ver `LienzoPlanograma`). Ambas rutas ya existen (`routes.tsx`) — este
 * modal es el único punto nuevo de entrada que decide a cuál navegar.
 */
export function SeleccionarVistaDisenoModal({ planogramaId, version, onClose }: SeleccionarVistaDisenoModalProps) {
  const navigate = useNavigate();
  const base = `/planogramas/${planogramaId}/versiones/${version.id}`;

  return (
    <Modal titulo={`Diseñar ${version.codigo}`} onClose={onClose} ancho="sm">
      <div className="seleccionar-vista-diseno">
        <button type="button" className="seleccionar-vista-diseno__opcion" onClick={() => navigate(`${base}/editor`)}>
          <span className="seleccionar-vista-diseno__titulo">Editor</span>
          <span className="seleccionar-vista-diseno__descripcion">
            Lista de niveles y posiciones, con las herramientas completas de edición.
          </span>
        </button>
        <button type="button" className="seleccionar-vista-diseno__opcion" onClick={() => navigate(`${base}/lienzo`)}>
          <span className="seleccionar-vista-diseno__titulo">Lienzo</span>
          <span className="seleccionar-vista-diseno__descripcion">
            Vista de canvas: arma la góndola arrastrando niveles y productos, con zoom y modo oscuro.
          </span>
        </button>
      </div>
    </Modal>
  );
}
