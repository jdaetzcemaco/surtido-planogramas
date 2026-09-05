import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { useToast } from '../../../../context/ToastContext';
import './ModalExportarLienzo.css';

interface ModalExportarLienzoProps {
  /** Lo que se esté viendo en el lienzo en ese momento (góndolas/niveles/posiciones ya cargados) — se serializa tal cual. */
  datos: unknown;
  onClose: () => void;
}

/** Exporta lo que hay cargado en el lienzo como JSON — para copiarlo o descargarlo, igual que "Exportar" en el Editor real (ver CLAUDE.md). */
export function ModalExportarLienzo({ datos, onClose }: ModalExportarLienzoProps) {
  const { mostrarToast } = useToast();
  const json = JSON.stringify(datos, null, 2);

  async function onCopiar() {
    try {
      await navigator.clipboard.writeText(json);
      mostrarToast('JSON copiado al portapapeles', 'success');
    } catch {
      mostrarToast('No se pudo copiar automáticamente — selecciona el texto manualmente', 'error');
    }
  }

  function onDescargar() {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'lienzo-planograma.json';
    enlace.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal
      titulo="Exportar lienzo (JSON)"
      onClose={onClose}
      ancho="lg"
      footer={
        <>
          <Button variante="outline" onClick={onCopiar}>
            Copiar al portapapeles
          </Button>
          <Button onClick={onDescargar}>Descargar .json</Button>
        </>
      }
    >
      <textarea className="modal-exportar-lienzo__texto" readOnly value={json} />
    </Modal>
  );
}
