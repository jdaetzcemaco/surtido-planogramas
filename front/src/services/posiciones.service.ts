import { httpClient } from './httpClient';
import type {
  AsignarSkuInput,
  PosicionAccesorio,
  PosicionAccesorioInput,
  PosicionCambiosCompletos,
  PosicionConProducto,
  PosicionDetalle,
  PosicionEditada,
  PosicionInput,
  PosicionMovida,
  PosicionPorSku,
  PosicionesDeNivel,
} from '../types/posicion';

export const posicionesService = {
  listarPorNivel: (nivelId: number) => httpClient.get<PosicionesDeNivel>(`/niveles/${nivelId}/posiciones`),

  agregar: (nivelId: number, datos: PosicionInput) =>
    httpClient.post<PosicionEditada>(`/niveles/${nivelId}/posiciones`, datos),

  obtener: (id: number) => httpClient.get<PosicionDetalle>(`/posiciones/${id}`),

  editar: (id: number, cambios: PosicionCambiosCompletos) =>
    httpClient.patch<PosicionEditada>(`/posiciones/${id}`, cambios),

  mover: (id: number, nivelId: number, ordenHorizontal: number) =>
    httpClient.patch<PosicionMovida>(`/posiciones/${id}/mover`, {
      nivel_id: nivelId,
      orden_horizontal: ordenHorizontal,
    }),

  copiar: (id: number, nivelIdDestino: number, ordenDestino: number) =>
    httpClient.post<PosicionDetalle>(`/posiciones/${id}/copiar`, {
      nivel_id_destino: nivelIdDestino,
      orden_destino: ordenDestino,
    }),

  eliminar: (id: number) => httpClient.delete<void>(`/posiciones/${id}`),

  listarAccesorios: (id: number) => httpClient.get<PosicionAccesorio[]>(`/posiciones/${id}/accesorios`),

  agregarAccesorio: (id: number, datos: PosicionAccesorioInput) =>
    httpClient.post<PosicionAccesorio>(`/posiciones/${id}/accesorios`, datos),

  eliminarAccesorio: (id: number, posicionAccesorioId: number) =>
    httpClient.delete<void>(`/posiciones/${id}/accesorios/${posicionAccesorioId}`),

  asignarSku: (id: number, datos: AsignarSkuInput) =>
    httpClient.patch<PosicionConProducto>(`/posiciones/${id}/asignar-sku`, datos),

  buscarPorSku: (sku: string, versionId: number) =>
    httpClient.get<PosicionPorSku>('/posiciones/por-sku', { sku, versionId }),
};
