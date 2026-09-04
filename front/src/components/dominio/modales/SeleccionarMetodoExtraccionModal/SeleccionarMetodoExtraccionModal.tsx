import { Modal } from '../../../ui/Modal/Modal';
import './SeleccionarMetodoExtraccionModal.css';

interface SeleccionarMetodoExtraccionModalProps {
  onClose: () => void;
  onSeleccionarImagenNumerada: () => void;
  onSeleccionarVisionCatalogo: () => void;
  onSeleccionarLienzo: () => void;
}

export function SeleccionarMetodoExtraccionModal({
  onClose,
  onSeleccionarImagenNumerada,
  onSeleccionarVisionCatalogo,
  onSeleccionarLienzo,
}: SeleccionarMetodoExtraccionModalProps) {
  return (
    <Modal titulo="Extraer de otra fuente" onClose={onClose} ancho="sm">
      <div className="seleccionar-metodo-extraccion">
        <button type="button" className="seleccionar-metodo-extraccion__opcion" onClick={onSeleccionarImagenNumerada}>
          <span className="seleccionar-metodo-extraccion__titulo">Imagen numerada</span>
          <span className="seleccionar-metodo-extraccion__descripcion">
            Foto del mueble con el número de gancho y el SKU de cada producto visibles.
          </span>
        </button>
        <button type="button" className="seleccionar-metodo-extraccion__opcion" onClick={onSeleccionarVisionCatalogo}>
          <span className="seleccionar-metodo-extraccion__titulo">Fotos del mueble (IA visual)</span>
          <span className="seleccionar-metodo-extraccion__descripcion">
            Hasta 4 fotos del mueble tal cual está — el agente identifica los productos comparando
            contra el catálogo de las subcategorías del planograma, sin necesitar SKUs visibles.
          </span>
        </button>
        <button type="button" className="seleccionar-metodo-extraccion__opcion" onClick={onSeleccionarLienzo}>
          <span className="seleccionar-metodo-extraccion__titulo">Lienzo</span>
          <span className="seleccionar-metodo-extraccion__descripcion">
            Foto del mueble tomada en ángulo — marcá las esquinas de la góndola a mano y se
            endereza a un encuadre plano y de frente, como un escáner de documentos.
          </span>
        </button>
      </div>
    </Modal>
  );
}
