import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { gondolasService } from '../../../../services/gondolas.service';
import { nivelesService } from '../../../../services/niveles.service';
import { posicionesService } from '../../../../services/posiciones.service';
import { catalogoService } from '../../../../services/catalogo.service';
import { mensajeDeError } from '../../../../utils/errors';
import { calcularAnchoAsignado, calcularCapacidadMaxima } from '../../../../utils/posicionCalculos';
import type { AccionBorrador, EstadoResultadoAccion, ResultadoAccion } from '../../../../types/agenteExtractor';
import type { GondolaListItem } from '../../../../types/gondola';
import type { Nivel } from '../../../../types/nivel';
import type { PosicionCambiosCompletos, PosicionesDeNivel } from '../../../../types/posicion';
import type { Accesorio } from '../../../../types/accesorio';
import './ResumenBorradorModal.css';

interface ResumenBorradorModalProps {
  borrador: AccionBorrador[];
  versionId: number;
  gondolas: GondolaListItem[];
  niveles: Nivel[];
  posicionesPorNivel: Record<number, PosicionesDeNivel>;
  accesorios: Accesorio[];
  onClose: () => void;
  onConfirmado: () => void;
}

/** Se lanza cuando una acción referencia una coordenada (góndola/nivel/espacio/accesorio) que no
 * se pudo resolver a un id real — porque nunca existió o porque la acción que la iba a crear más
 * arriba en el mismo borrador falló. Se distingue de un error de API real para poder marcar la
 * fila como "omitida" (nunca se intentó) en vez de "fallida" (se intentó y la API la rechazó). */
class DependenciaNoResueltaError extends Error {}

function requerido<T>(valor: T | null | undefined, mensaje: string): T {
  if (valor === null || valor === undefined) throw new DependenciaNoResueltaError(mensaje);
  return valor;
}

interface MapasResolucion {
  gondolaIdPorOrden: Map<number, number>;
  nivelIdPorClave: Map<string, number>;
  posicionIdPorClave: Map<string, number>;
}

const claveNivel = (gondolaOrden: number, nivelOrden: number) => `${gondolaOrden}:${nivelOrden}`;
const clavePosicion = (gondolaOrden: number, nivelOrden: number, espacioOrden: number) =>
  `${gondolaOrden}:${nivelOrden}:${espacioOrden}`;

/** Semilla los mapas de coordenada → id real con el estado actual del editor (todas las góndolas
 * de la versión, no solo la activa) — se van completando/actualizando a medida que la ejecución
 * avanza y crea, mueve o elimina elementos. */
function construirMapasIniciales(
  gondolas: GondolaListItem[],
  niveles: Nivel[],
  posicionesPorNivel: Record<number, PosicionesDeNivel>,
): MapasResolucion {
  const gondolaIdPorOrden = new Map(gondolas.map((g) => [g.orden, g.id]));
  const gondolaPorId = new Map(gondolas.map((g) => [g.id, g]));
  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));

  const nivelIdPorClave = new Map<string, number>();
  niveles.forEach((n) => {
    const gondola = gondolaPorId.get(n.gondolaId);
    if (gondola) nivelIdPorClave.set(claveNivel(gondola.orden, n.orden), n.id);
  });

  const posicionIdPorClave = new Map<string, number>();
  Object.entries(posicionesPorNivel).forEach(([nivelIdStr, datos]) => {
    const nivel = nivelPorId.get(Number(nivelIdStr));
    const gondola = nivel ? gondolaPorId.get(nivel.gondolaId) : undefined;
    if (!nivel || !gondola) return;
    datos.posiciones.forEach((p) => {
      posicionIdPorClave.set(clavePosicion(gondola.orden, nivel.orden, p.orden_horizontal), p.id);
    });
  });

  return { gondolaIdPorOrden, nivelIdPorClave, posicionIdPorClave };
}

function resolverGondolaId(orden: number | null | undefined, maps: MapasResolucion): number {
  const ordenSeguro = requerido(orden, 'Falta especificar la góndola.');
  const id = maps.gondolaIdPorOrden.get(ordenSeguro);
  if (id === undefined) throw new DependenciaNoResueltaError(`La góndola ${ordenSeguro} no existe (no se pudo crear, o depende de una acción anterior que falló).`);
  return id;
}

function resolverNivelId(gondolaOrden: number | null | undefined, nivelOrden: number | null | undefined, maps: MapasResolucion): number {
  const gondolaOrdenSeguro = requerido(gondolaOrden, 'Falta especificar la góndola del nivel.');
  const nivelOrdenSeguro = requerido(nivelOrden, 'Falta especificar el nivel.');
  const id = maps.nivelIdPorClave.get(claveNivel(gondolaOrdenSeguro, nivelOrdenSeguro));
  if (id === undefined) {
    throw new DependenciaNoResueltaError(
      `El nivel ${nivelOrdenSeguro} de la góndola ${gondolaOrdenSeguro} no existe (no se pudo crear, o depende de una acción anterior que falló).`,
    );
  }
  return id;
}

function resolverPosicionId(
  gondolaOrden: number | null | undefined,
  nivelOrden: number | null | undefined,
  espacioOrden: number | null | undefined,
  maps: MapasResolucion,
): number {
  const gondolaOrdenSeguro = requerido(gondolaOrden, 'Falta especificar la góndola de la posición.');
  const nivelOrdenSeguro = requerido(nivelOrden, 'Falta especificar el nivel de la posición.');
  const espacioOrdenSeguro = requerido(espacioOrden, 'Falta especificar el espacio de la posición.');
  const id = maps.posicionIdPorClave.get(clavePosicion(gondolaOrdenSeguro, nivelOrdenSeguro, espacioOrdenSeguro));
  if (id === undefined) {
    throw new DependenciaNoResueltaError(
      `La posición en góndola ${gondolaOrdenSeguro}/nivel ${nivelOrdenSeguro}/espacio ${espacioOrdenSeguro} no existe (no se pudo crear, mover, o depende de una acción anterior que falló).`,
    );
  }
  return id;
}

/** Descripción legible de una acción — se reusa tanto en la tabla de revisión (antes de aplicar)
 * como en la de resultados (después de aplicar). */
function describirAccion(accion: AccionBorrador): string {
  switch (accion.tipo_accion) {
    case 'crear_gondola':
      return `Crear góndola "${accion.nombre ?? '—'}"`;
    case 'editar_gondola':
      return `Editar góndola ${accion.gondola_orden ?? '—'}`;
    case 'eliminar_gondola':
      return `Eliminar góndola ${accion.gondola_orden ?? '—'}`;
    case 'reordenar_gondolas':
      return `Reordenar góndolas: ${accion.orden_gondolas.join(' → ')}`;
    case 'agregar_nivel':
      return `Agregar nivel ${accion.nivel_orden ?? '(al final)'} en góndola ${accion.gondola_orden ?? '—'}`;
    case 'editar_nivel':
      return `Editar nivel ${accion.nivel_orden} de góndola ${accion.gondola_orden}`;
    case 'eliminar_nivel':
      return `Eliminar nivel ${accion.nivel_orden} de góndola ${accion.gondola_orden}`;
    case 'reordenar_niveles':
      return `Reordenar niveles de góndola ${accion.gondola_orden}: ${accion.orden_niveles.join(' → ')}`;
    case 'agregar_producto':
      return `Agregar SKU ${accion.sku}${accion.nombre ? ` (${accion.nombre})` : ''} → góndola ${accion.gondola_orden ?? '—'}/nivel ${accion.nivel_orden ?? '—'}/espacio ${accion.espacio_orden ?? '—'}`;
    case 'editar_producto':
      return `Editar producto en góndola ${accion.gondola_orden}/nivel ${accion.nivel_orden}/espacio ${accion.espacio_orden}`;
    case 'mover_producto':
      return `Mover producto de góndola ${accion.gondola_orden}/nivel ${accion.nivel_orden}/espacio ${accion.espacio_orden} → góndola ${accion.gondola_orden_destino}/nivel ${accion.nivel_orden_destino}/espacio ${accion.espacio_orden_destino ?? '(siguiente libre)'}`;
    case 'duplicar_producto':
      return `Duplicar producto de góndola ${accion.gondola_orden}/nivel ${accion.nivel_orden}/espacio ${accion.espacio_orden} → góndola ${accion.gondola_orden_destino}/nivel ${accion.nivel_orden_destino}/espacio ${accion.espacio_orden_destino ?? '(siguiente libre)'}`;
    case 'eliminar_producto':
      return `Eliminar producto en góndola ${accion.gondola_orden}/nivel ${accion.nivel_orden}/espacio ${accion.espacio_orden}`;
    case 'agregar_accesorio_posicion':
      return `Agregar accesorio ${accion.accesorio_codigo ?? '—'} a góndola ${accion.gondola_orden}/nivel ${accion.nivel_orden}/espacio ${accion.espacio_orden}`;
    case 'quitar_accesorio_posicion':
      return `Quitar accesorio ${accion.accesorio_codigo ?? '—'} de góndola ${accion.gondola_orden}/nivel ${accion.nivel_orden}/espacio ${accion.espacio_orden}`;
    case 'actualizar_medidas_producto':
      return `Actualizar medidas del SKU ${accion.sku}`;
    case 'validar_dimensiones_producto':
      return `Validar dimensiones del SKU ${accion.sku}`;
    default:
      return 'Acción desconocida';
  }
}

/** Ejecuta una única acción normalizada (sin advertencia) contra los servicios del editor —
 * reutiliza exactamente los mismos endpoints que los modales manuales del editor, nunca
 * endpoints nuevos. Muta `maps` cuando la acción crea, mueve o elimina algo, para que las
 * acciones siguientes del mismo borrador puedan resolver sus propias coordenadas. */
async function ejecutarAccion(accion: AccionBorrador, versionId: number, accesorios: Accesorio[], maps: MapasResolucion): Promise<void> {
  switch (accion.tipo_accion) {
    case 'crear_gondola': {
      const gondola = await gondolasService.agregar(versionId, {
        nombre: requerido(accion.nombre, 'Falta el nombre de la góndola.'),
        ancho_cm: requerido(accion.ancho_cm, 'Falta el ancho de la góndola.'),
        alto_cm: requerido(accion.alto_cm, 'Falta el alto de la góndola.'),
        profundidad_cm: requerido(accion.profundidad_cm, 'Falta la profundidad de la góndola.'),
        posicion_en_tienda: accion.posicion_en_tienda ?? undefined,
      });
      maps.gondolaIdPorOrden.set(requerido(accion.gondola_orden, 'Falta el orden de la góndola creada.'), gondola.id);
      return;
    }
    case 'editar_gondola': {
      const gondolaId = resolverGondolaId(accion.gondola_orden, maps);
      await gondolasService.editar(gondolaId, {
        nombre: accion.nombre ?? undefined,
        ancho_cm: accion.ancho_cm ?? undefined,
        alto_cm: accion.alto_cm ?? undefined,
        profundidad_cm: accion.profundidad_cm ?? undefined,
        posicion_en_tienda: accion.posicion_en_tienda ?? undefined,
      });
      return;
    }
    case 'eliminar_gondola': {
      const gondolaId = resolverGondolaId(accion.gondola_orden, maps);
      const resumen = await gondolasService.obtenerResumen(gondolaId);
      await gondolasService.eliminar(gondolaId, resumen.totalNiveles > 0 || resumen.totalPosiciones > 0);
      maps.gondolaIdPorOrden.delete(requerido(accion.gondola_orden, ''));
      return;
    }
    case 'reordenar_gondolas': {
      const orden = accion.orden_gondolas.map((gondolaOrden, i) => ({ id: resolverGondolaId(gondolaOrden, maps), orden: i + 1 }));
      await gondolasService.reordenar(versionId, orden);
      return;
    }
    case 'agregar_nivel': {
      const gondolaId = resolverGondolaId(accion.gondola_orden, maps);
      const nivel = await nivelesService.agregar(gondolaId, {
        orden: requerido(accion.nivel_orden, 'Falta el orden del nivel creado.'),
        altura_desde_piso_cm: requerido(accion.altura_desde_piso_cm, 'Falta la altura desde el piso.'),
        tipo_accesorio: requerido(accion.tipo_accesorio, 'Falta el tipo de accesorio del nivel.'),
        codigo_accesorio_id: accion.codigo_accesorio_id ?? undefined,
        tamano_accesorio_pulgadas: accion.tamano_accesorio_pulgadas ?? undefined,
        ancho_disponible_cm: requerido(accion.ancho_disponible_cm, 'Falta el ancho disponible del nivel.'),
        notas: accion.notas ?? null,
      });
      maps.nivelIdPorClave.set(claveNivel(requerido(accion.gondola_orden, ''), nivel.orden), nivel.id);
      return;
    }
    case 'editar_nivel': {
      const nivelId = resolverNivelId(accion.gondola_orden, accion.nivel_orden, maps);
      await nivelesService.editar(nivelId, {
        altura_desde_piso_cm: accion.altura_desde_piso_cm ?? undefined,
        tipo_accesorio: accion.tipo_accesorio ?? undefined,
        codigo_accesorio_id: accion.codigo_accesorio_id ?? undefined,
        tamano_accesorio_pulgadas: accion.tamano_accesorio_pulgadas ?? undefined,
        ancho_disponible_cm: accion.ancho_disponible_cm ?? undefined,
        notas: accion.notas ?? undefined,
      });
      return;
    }
    case 'eliminar_nivel': {
      const nivelId = resolverNivelId(accion.gondola_orden, accion.nivel_orden, maps);
      const resumen = await nivelesService.obtenerResumen(nivelId);
      await nivelesService.eliminar(nivelId, resumen.totalPosiciones > 0);
      maps.nivelIdPorClave.delete(claveNivel(requerido(accion.gondola_orden, ''), requerido(accion.nivel_orden, '')));
      return;
    }
    case 'reordenar_niveles': {
      const gondolaId = resolverGondolaId(accion.gondola_orden, maps);
      const orden = accion.orden_niveles.map((nivelOrden, i) => ({
        id: resolverNivelId(accion.gondola_orden, nivelOrden, maps),
        orden: i + 1,
      }));
      await nivelesService.reordenar(gondolaId, orden);
      return;
    }
    case 'agregar_producto': {
      const nivelId = resolverNivelId(accion.gondola_orden, accion.nivel_orden, maps);
      const capacidadMaxima = calcularCapacidadMaxima(accion.facings_horizontal, accion.cantidad_apilable, accion.unidades_por_facing);
      // Si el catálogo ya tiene el ancho del producto, se usa de una vez (facings × ese ancho) —
      // igual criterio que "Elegir producto"; si no se pudo resolver, placeholder de 1 cm por
      // facing que se corrige después con "Actualizar medidas"/al editar facings.
      const anchoProducto = await catalogoService.obtenerProducto(accion.sku).then(
        (p) => p.ancho_cm,
        () => null,
      );
      const posicion = await posicionesService.agregar(nivelId, {
        sku: accion.sku,
        orden_horizontal: requerido(accion.espacio_orden, 'Falta el espacio del producto.'),
        ancho_asignado_cm: calcularAnchoAsignado(accion.facings_horizontal, anchoProducto, accion.facings_horizontal),
        capacidad_maxima: capacidadMaxima,
        facings_horizontal: accion.facings_horizontal,
        cantidad_apilable: accion.cantidad_apilable,
        unidades_por_facing: accion.unidades_por_facing,
        perfil_redondeo: accion.perfil_redondeo,
        modo: accion.modo,
        decision: accion.decision,
      });
      maps.posicionIdPorClave.set(
        clavePosicion(requerido(accion.gondola_orden, ''), requerido(accion.nivel_orden, ''), posicion.orden_horizontal),
        posicion.id,
      );
      return;
    }
    case 'editar_producto': {
      const posicionId = resolverPosicionId(accion.gondola_orden, accion.nivel_orden, accion.espacio_orden, maps);
      const cambios: PosicionCambiosCompletos = {};

      if (accion.facings_horizontal != null || accion.cantidad_apilable != null || accion.unidades_por_facing != null) {
        const actual = await posicionesService.obtener(posicionId);
        const facings = accion.facings_horizontal ?? actual.facings_horizontal;
        const apilable = accion.cantidad_apilable ?? actual.cantidad_apilable;
        const unidades = accion.unidades_por_facing ?? actual.unidades_por_facing;
        cambios.facings_horizontal = facings;
        cambios.cantidad_apilable = apilable;
        cambios.unidades_por_facing = unidades;
        cambios.capacidad_maxima = calcularCapacidadMaxima(facings, apilable, unidades);
      }
      if (accion.perfil_redondeo != null) cambios.perfil_redondeo = accion.perfil_redondeo;
      if (accion.min_final != null) cambios.min_final = accion.min_final;
      if (accion.max_final != null) cambios.max_final = accion.max_final;
      if (accion.modo != null) cambios.modo = accion.modo;
      if (accion.decision != null) cambios.decision = accion.decision;
      if (accion.cross_externo != null) cambios.cross_externo = accion.cross_externo;
      if (accion.montar_en_display != null) cambios.montar_en_display = accion.montar_en_display;
      if (accion.observaciones != null) cambios.observaciones = accion.observaciones;
      if (accion.desborda_gondola != null) cambios.desborda_gondola = accion.desborda_gondola;
      if (accion.nota_desborde != null) cambios.nota_desborde = accion.nota_desborde;

      await posicionesService.editar(posicionId, cambios);
      return;
    }
    case 'mover_producto': {
      const posicionId = resolverPosicionId(accion.gondola_orden, accion.nivel_orden, accion.espacio_orden, maps);
      const nivelDestinoId = resolverNivelId(accion.gondola_orden_destino, accion.nivel_orden_destino, maps);
      const movida = await posicionesService.mover(
        posicionId,
        nivelDestinoId,
        requerido(accion.espacio_orden_destino, 'Falta el espacio destino.'),
      );
      maps.posicionIdPorClave.delete(clavePosicion(requerido(accion.gondola_orden, ''), requerido(accion.nivel_orden, ''), requerido(accion.espacio_orden, '')));
      maps.posicionIdPorClave.set(
        clavePosicion(requerido(accion.gondola_orden_destino, ''), requerido(accion.nivel_orden_destino, ''), movida.orden_horizontal),
        movida.id,
      );
      return;
    }
    case 'duplicar_producto': {
      const posicionId = resolverPosicionId(accion.gondola_orden, accion.nivel_orden, accion.espacio_orden, maps);
      const nivelDestinoId = resolverNivelId(accion.gondola_orden_destino, accion.nivel_orden_destino, maps);
      const copia = await posicionesService.copiar(
        posicionId,
        nivelDestinoId,
        requerido(accion.espacio_orden_destino, 'Falta el espacio destino.'),
      );
      maps.posicionIdPorClave.set(
        clavePosicion(requerido(accion.gondola_orden_destino, ''), requerido(accion.nivel_orden_destino, ''), copia.orden_horizontal),
        copia.id,
      );
      return;
    }
    case 'eliminar_producto': {
      const posicionId = resolverPosicionId(accion.gondola_orden, accion.nivel_orden, accion.espacio_orden, maps);
      await posicionesService.eliminar(posicionId);
      maps.posicionIdPorClave.delete(clavePosicion(requerido(accion.gondola_orden, ''), requerido(accion.nivel_orden, ''), requerido(accion.espacio_orden, '')));
      return;
    }
    case 'agregar_accesorio_posicion': {
      const posicionId = resolverPosicionId(accion.gondola_orden, accion.nivel_orden, accion.espacio_orden, maps);
      const accesorio = accesorios.find((a) => a.codigo === accion.accesorio_codigo);
      if (!accesorio) throw new DependenciaNoResueltaError(`El accesorio '${accion.accesorio_codigo ?? '—'}' no existe en el catálogo.`);
      await posicionesService.agregarAccesorio(posicionId, { accesorio_id: accesorio.id, nota_libre: accion.nota_libre ?? null });
      return;
    }
    case 'quitar_accesorio_posicion': {
      const posicionId = resolverPosicionId(accion.gondola_orden, accion.nivel_orden, accion.espacio_orden, maps);
      const actuales = await posicionesService.listarAccesorios(posicionId);
      const existente = actuales.find((a) => a.accesorio.codigo === accion.accesorio_codigo);
      if (!existente) throw new DependenciaNoResueltaError(`La posición no tiene asignado el accesorio '${accion.accesorio_codigo ?? '—'}'.`);
      await posicionesService.eliminarAccesorio(posicionId, existente.id);
      return;
    }
    case 'actualizar_medidas_producto': {
      await catalogoService.actualizarDimensiones(accion.sku, {
        ancho_cm: requerido(accion.ancho_cm, 'Falta el ancho del producto.'),
        alto_cm: requerido(accion.alto_cm, 'Falta el alto del producto.'),
        profundidad_cm: requerido(accion.profundidad_cm, 'Falta la profundidad del producto.'),
      });
      return;
    }
    case 'validar_dimensiones_producto': {
      await catalogoService.validarDimensiones(accion.sku);
      return;
    }
    default:
      throw new Error(`Tipo de acción desconocido: ${(accion as AccionBorrador).tipo_accion}`);
  }
}

interface FilaPreview {
  indice: number;
  accion: AccionBorrador;
}

const ETIQUETAS_ESTADO: Record<EstadoResultadoAccion, string> = {
  ejecutada: 'Ejecutada',
  fallida: 'Fallida',
  omitida: 'Omitida',
};

export function ResumenBorradorModal({
  borrador,
  versionId,
  gondolas,
  niveles,
  posicionesPorNivel,
  accesorios,
  onClose,
  onConfirmado,
}: ResumenBorradorModalProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [progreso, setProgreso] = useState<ResultadoAccion[]>([]);
  const [resultados, setResultados] = useState<ResultadoAccion[] | null>(null);

  const filas: FilaPreview[] = borrador.map((accion, indice) => ({ indice, accion }));
  const filasValidas = filas.filter((f) => !f.accion.advertencia);

  async function onConfirmar() {
    if (confirmando || filasValidas.length === 0) return;
    setConfirmando(true);
    setProgreso([]);

    const maps = construirMapasIniciales(gondolas, niveles, posicionesPorNivel);
    const nuevosResultados: ResultadoAccion[] = [];

    // Recorre TODO el borrador (no solo las filas válidas) en orden, para que el índice y el
    // resumen de cada fila de resultados coincidan uno a uno con lo que el usuario revisó arriba.
    // Cada resultado se agrega a `progreso` apenas se conoce (no al final del for) para que la
    // tabla de abajo anime fila por fila: spinner en la que se está ejecutando, check al terminar.
    for (const { indice, accion } of filas) {
      const resumen = describirAccion(accion);
      let resultado: ResultadoAccion;

      if (accion.advertencia) {
        resultado = { indice, tipoAccion: accion.tipo_accion, resumen, estado: 'omitida', motivo: accion.advertencia };
      } else {
        try {
          await ejecutarAccion(accion, versionId, accesorios, maps);
          resultado = { indice, tipoAccion: accion.tipo_accion, resumen, estado: 'ejecutada' };
        } catch (err) {
          if (err instanceof DependenciaNoResueltaError) {
            resultado = { indice, tipoAccion: accion.tipo_accion, resumen, estado: 'omitida', motivo: err.message };
          } else {
            resultado = {
              indice,
              tipoAccion: accion.tipo_accion,
              resumen,
              estado: 'fallida',
              motivo: mensajeDeError(err, 'No se pudo aplicar esta acción'),
            };
          }
        }
      }

      nuevosResultados.push(resultado);
      setProgreso((prev) => [...prev, resultado]);
    }

    setResultados(nuevosResultados);
    setConfirmando(false);
    onConfirmado();
  }

  /** Ícono de progreso de una fila mientras se aplica el borrador: pendiente (sin iniciar),
   * cargando (es la fila que se está ejecutando ahora mismo) o el resultado final una vez que
   * `ejecutarAccion` resuelve para esa fila — se apoya en que `progreso` acumula un resultado por
   * fila en el mismo orden que `filas`, así que su longitud indica cuál es la fila "en curso". */
  function iconoEstadoFila(fila: FilaPreview) {
    const resultado = progreso.find((r) => r.indice === fila.indice);
    if (resultado) {
      const variante =
        resultado.estado === 'ejecutada' ? 'ok' : resultado.estado === 'fallida' ? 'error' : 'omitida';
      const simbolo = resultado.estado === 'ejecutada' ? '✓' : resultado.estado === 'fallida' ? '✕' : '!';
      return (
        <span
          className={`resumen-borrador-modal__icono resumen-borrador-modal__icono--${variante}`}
          title={resultado.motivo ?? ETIQUETAS_ESTADO[resultado.estado]}
        >
          {simbolo}
        </span>
      );
    }
    if (confirmando && fila.indice === progreso.length) {
      return <span className="resumen-borrador-modal__icono resumen-borrador-modal__icono--cargando" aria-label="Ejecutando" />;
    }
    return <span className="resumen-borrador-modal__icono resumen-borrador-modal__icono--pendiente" aria-hidden="true" />;
  }

  const columnasPreview: TableColumn<FilaPreview>[] = [
    { key: 'estado', header: '', render: iconoEstadoFila },
    { key: 'indice', header: '#', render: (f) => f.indice + 1 },
    { key: 'detalle', header: 'Acción', render: (f) => describirAccion(f.accion) },
    { key: 'advertencia', header: 'Advertencia', render: (f) => f.accion.advertencia ?? '—' },
  ];

  const columnasResultado: TableColumn<ResultadoAccion>[] = [
    { key: 'indice', header: '#', render: (r) => r.indice + 1 },
    { key: 'detalle', header: 'Acción', render: (r) => r.resumen },
    { key: 'estado', header: 'Estado', render: (r) => ETIQUETAS_ESTADO[r.estado] },
    { key: 'motivo', header: 'Motivo', render: (r) => r.motivo ?? '—' },
  ];

  if (resultados) {
    const ejecutadas = resultados.filter((r) => r.estado === 'ejecutada').length;
    const fallidas = resultados.filter((r) => r.estado === 'fallida').length;
    const omitidas = resultados.filter((r) => r.estado === 'omitida').length;

    return (
      <Modal
        titulo="Resultado de la aplicación"
        onClose={onClose}
        ancho="xl"
        footer={
          <Button variante="primary" onClick={onClose}>
            Cerrar
          </Button>
        }
      >
        <div className="resumen-borrador-modal">
          <p className="resumen-borrador-modal__ayuda">
            {ejecutadas} acción(es) ejecutada(s), {fallidas} fallida(s), {omitidas} omitida(s).
          </p>
          <Table<ResultadoAccion>
            columns={columnasResultado}
            rows={resultados}
            rowKey={(r) => r.indice}
            rowClassName={(r) => (r.estado !== 'ejecutada' ? 'resumen-borrador-modal__fila--advertencia' : undefined)}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      titulo="Resumen de acciones"
      onClose={onClose}
      ancho="xl"
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={confirmando}>
            Cancelar
          </Button>
          <Button variante="primary" onClick={onConfirmar} disabled={confirmando || filasValidas.length === 0}>
            {confirmando ? 'Aplicando…' : `Confirmar y aplicar (${filasValidas.length})`}
          </Button>
        </>
      }
    >
      <div className="resumen-borrador-modal">
        {filas.length === 0 ? (
          <p className="resumen-borrador-modal__ayuda">Todavía no hay acciones en el borrador.</p>
        ) : (
          <Table<FilaPreview>
            columns={columnasPreview}
            rows={filas}
            rowKey={(f) => f.indice}
            rowClassName={(f) => {
              if (confirmando && f.indice === progreso.length) return 'resumen-borrador-modal__fila--en-curso';
              return f.accion.advertencia ? 'resumen-borrador-modal__fila--advertencia' : undefined;
            }}
          />
        )}
      </div>
    </Modal>
  );
}
