import type { GondolaListItem } from '../types/gondola';
import type { Nivel } from '../types/nivel';
import type { PosicionesDeNivel } from '../types/posicion';
import type { Accesorio } from '../types/accesorio';
import type { ContextoAgenteExtractor } from '../types/agenteExtractor';

/** Arma el contexto liviano (coordenadas legibles, sin ids de BD) que se le manda al Agente
 * Extractor en cada mensaje, a partir de los datos reales (con ids) ya cargados en el editor —
 * ver `useNivelesDeVersion`/`usePosicionesDeNiveles`/`useAccesorios`. */
export function construirContextoAgente(
  gondolas: GondolaListItem[],
  niveles: Nivel[],
  posicionesPorNivel: Record<number, PosicionesDeNivel>,
  accesorios: Accesorio[],
  subcategorias: string[],
): ContextoAgenteExtractor {
  const gondolaPorId = new Map(gondolas.map((g) => [g.id, g]));
  const nivelPorId = new Map(niveles.map((n) => [n.id, n]));

  return {
    subcategorias,
    gondolas: gondolas.map((g) => ({
      gondola_orden: g.orden,
      nombre: g.nombre,
      total_niveles: g.totalNiveles,
      ancho_cm: g.ancho_cm,
    })),
    niveles: niveles.flatMap((n) => {
      const gondola = gondolaPorId.get(n.gondolaId);
      if (!gondola) return [];
      return [{ gondola_orden: gondola.orden, nivel_orden: n.orden, tipo_accesorio: n.tipo_accesorio }];
    }),
    posiciones: Object.entries(posicionesPorNivel).flatMap(([nivelId, datos]) => {
      const nivel = nivelPorId.get(Number(nivelId));
      const gondola = nivel ? gondolaPorId.get(nivel.gondolaId) : undefined;
      if (!nivel || !gondola) return [];
      // Las posiciones PENDIENTE (capturadas sin SKU asignado todavía) no tienen sku — el agente
      // no necesita saber de espacios vacíos, y el backend rechaza sku null (ver schemaMensaje).
      return datos.posiciones.flatMap((p) => {
        if (p.sku === null) return [];
        return [{
          gondola_orden: gondola.orden,
          nivel_orden: nivel.orden,
          espacio_orden: p.orden_horizontal,
          sku: p.sku,
          nombre: p.producto?.nombre ?? null,
        }];
      });
    }),
    accesorios: accesorios.map((a) => ({ codigo: a.codigo, nombre: a.nombre, tipo: a.tipo })),
  };
}
