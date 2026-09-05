import './LienzoToolbar.css';

interface LienzoToolbarProps {
  catalogoVisible: boolean;
  onToggleCatalogo: () => void;
  onAgregarGondola: () => void;
  onExportar: () => void;
}

/** Franja vertical de acciones del lienzo — mismo espíritu que la barra de herramientas de las apps de canvas (n8n incluido), reducida a lo que este módulo realmente necesita. */
export function LienzoToolbar({ catalogoVisible, onToggleCatalogo, onAgregarGondola, onExportar }: LienzoToolbarProps) {
  return (
    <aside className="lienzo-toolbar">
      <button
        type="button"
        className={`lienzo-toolbar__boton${catalogoVisible ? ' lienzo-toolbar__boton--activo' : ''}`}
        title="Catálogo de productos"
        onClick={onToggleCatalogo}
      >
        ▤
      </button>
      <button type="button" className="lienzo-toolbar__boton" title="Agregar góndola" onClick={onAgregarGondola}>
        ＋
      </button>
      <div className="lienzo-toolbar__separador" />
      <button type="button" className="lienzo-toolbar__boton" title="Exportar lienzo (JSON)" onClick={onExportar}>
        ⇩
      </button>
    </aside>
  );
}
