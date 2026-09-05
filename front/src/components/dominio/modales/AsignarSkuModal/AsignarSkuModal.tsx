import { useState, useEffect, useRef } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { catalogoService } from '../../../../services/catalogo.service';
import { posicionesService } from '../../../../services/posiciones.service';
import { useToast } from '../../../../context/ToastContext';
import type { PosicionConProducto } from '../../../../types/posicion';
import type { ProductoCatalogo } from '../../../../types/catalogo';
import './AsignarSkuModal.css';

interface AsignarSkuModalProps {
  posicion: PosicionConProducto;
  subcategorias: string[];
  onClose: () => void;
  onAsignado: (posicionActualizada: PosicionConProducto) => void;
}

function parseSubcatFiltro(raw: string): string {
  const match = raw.match(/^\((.+?)\)/);
  return match ? match[1] : raw;
}

export function AsignarSkuModal({ posicion, subcategorias, onClose, onAsignado }: AsignarSkuModalProps) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<ProductoCatalogo[]>([]);
  const [origenBusqueda, setOrigenBusqueda] = useState<'subcategoria' | 'catalogo' | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mostrarToast } = useToast();

  const datosVision = posicion.datos_vision;
  const alternativas = datosVision?.alternatives ?? [];

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResultados([]);
      setOrigenBusqueda(null);
      return;
    }
    debounceRef.current = setTimeout(() => buscar(query.trim()), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function buscar(q: string) {
    setBuscando(true);
    try {
      // 1. Buscar primero dentro de las subcategorías del planograma
      if (subcategorias.length > 0) {
        const filtro = parseSubcatFiltro(subcategorias[0]);
        const enSubcat = await catalogoService.buscarProductos(q, { subcategoria: filtro, pageSize: 20 });
        if (enSubcat.length > 0) {
          setResultados(enSubcat);
          setOrigenBusqueda('subcategoria');
          return;
        }
      }
      // 2. Si no hay resultados en subcategoría, buscar en catálogo completo
      const enCatalogo = await catalogoService.buscarProductos(q, { pageSize: 20 });
      setResultados(enCatalogo);
      setOrigenBusqueda(enCatalogo.length > 0 ? 'catalogo' : null);
    } catch {
      mostrarToast('No se pudo buscar en el catálogo', 'error');
    } finally {
      setBuscando(false);
    }
  }

  async function seleccionarProducto(producto: ProductoCatalogo) {
    if (guardando) return;
    setGuardando(true);
    try {
      const actualizada = await posicionesService.asignarSku(posicion.id, {
        sku: producto.sku,
        subcategorias: subcategorias.map(parseSubcatFiltro),
      });
      onAsignado(actualizada as PosicionConProducto);
    } catch (err) {
      mostrarToast(
        err instanceof Error ? err.message : 'No se pudo asignar el SKU',
        'error',
      );
    } finally {
      setGuardando(false);
    }
  }

  async function seleccionarAlternativa(sku: string) {
    if (guardando) return;
    setGuardando(true);
    try {
      const actualizada = await posicionesService.asignarSku(posicion.id, {
        sku,
        subcategorias: subcategorias.map(parseSubcatFiltro),
      });
      onAsignado(actualizada as PosicionConProducto);
    } catch (err) {
      mostrarToast(
        err instanceof Error ? err.message : 'No se pudo asignar el SKU',
        'error',
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo="Asignar SKU"
      onClose={onClose}
      ancho="md"
      footer={
        <Button variante="outline" onClick={onClose} disabled={guardando}>
          Cancelar
        </Button>
      }
    >
      <div className="asignar-sku-modal">

        {/* Info del agente de visión */}
        {datosVision && (
          <div className="asignar-sku-modal__vision-info">
            <p className="asignar-sku-modal__detectado">
              Detectado: <strong>{datosVision.detectedName}</strong>
              <span className="asignar-sku-modal__confidence">{datosVision.confidence}%</span>
            </p>
            {datosVision.reason && (
              <p className="asignar-sku-modal__reason">{datosVision.reason}</p>
            )}
          </div>
        )}

        {/* Alternativas del agente */}
        {alternativas.length > 0 && (
          <div className="asignar-sku-modal__alternativas">
            <p className="asignar-sku-modal__label">Alternativas sugeridas por el agente:</p>
            <ul className="asignar-sku-modal__alternativas-lista">
              {alternativas.map((alt) => (
                <li key={alt.sku}>
                  <button
                    type="button"
                    className="asignar-sku-modal__alt-btn"
                    onClick={() => seleccionarAlternativa(alt.sku)}
                    disabled={guardando}
                  >
                    <span className="asignar-sku-modal__alt-sku">{alt.sku}</span>
                    <span className="asignar-sku-modal__alt-name">{alt.name}</span>
                    <span className="asignar-sku-modal__alt-conf">{alt.confidence}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Búsqueda en catálogo */}
        <div className="asignar-sku-modal__search">
          <p className="asignar-sku-modal__label">O buscá en el catálogo:</p>
          <input
            type="text"
            className="asignar-sku-modal__input"
            placeholder="Nombre o SKU del producto…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={guardando}
            autoFocus
          />

          {origenBusqueda === 'catalogo' && resultados.length > 0 && (
            <p className="asignar-sku-modal__cross-aviso">
              No se encontró en las subcategorías del planograma — se asignará como <strong>CROSS</strong>
            </p>
          )}

          {buscando && <p className="asignar-sku-modal__buscando">Buscando…</p>}

          {!buscando && query.trim() && resultados.length === 0 && origenBusqueda === null && (
            <p className="asignar-sku-modal__buscando">Sin resultados para "{query}"</p>
          )}

          {resultados.length > 0 && (
            <ul className="asignar-sku-modal__resultados">
              {resultados.map((p) => (
                <li key={p.sku}>
                  <button
                    type="button"
                    className="asignar-sku-modal__resultado-btn"
                    onClick={() => seleccionarProducto(p)}
                    disabled={guardando}
                  >
                    {p.imagen_url && (
                      <img src={p.imagen_url} alt={p.nombre} className="asignar-sku-modal__resultado-img" />
                    )}
                    <span className="asignar-sku-modal__resultado-info">
                      <span className="asignar-sku-modal__resultado-nombre">{p.nombre}</span>
                      <span className="asignar-sku-modal__resultado-sku">{p.sku}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </Modal>
  );
}
