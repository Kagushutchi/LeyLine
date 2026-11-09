import { apiClient } from '@/common/api/http-client';

export type EstadoSolicitud = 'pendiente' | 'procesando' | 'completado' | 'rechazado' | 'fallido';
export interface SolicitudDTO {
  id: string;
  cajaMensualId: string;
  estado: EstadoSolicitud;
  suscripcionId?: string | null;
  errorPublico?: string | null;
}
export interface SolicitudPayload { cajaMensualId: string; precioConfirmadoCentavos: number }
interface Response<T> { status: string; data: T }

export const solicitudesService = {
  async create(payload: SolicitudPayload, key: string): Promise<SolicitudDTO> {
    const response: Response<SolicitudDTO> = await apiClient.post('/solicitudes-suscripcion', payload, {
      headers: { 'Idempotency-Key': key },
    });
    return response.data;
  },
  /** Long-poll: resolves as soon as the request is terminal or after waitMs. */
  async wait(id: string, waitMs: number): Promise<SolicitudDTO> {
    const response: Response<SolicitudDTO> = await apiClient.get(`/solicitudes-suscripcion/${encodeURIComponent(id)}`, {
      params: { waitMs }, timeout: waitMs + 5000,
    });
    return response.data;
  },
  async list(): Promise<SolicitudDTO[]> {
    const response: Response<SolicitudDTO[]> = await apiClient.get('/solicitudes-suscripcion');
    if (!Array.isArray(response.data)) throw new Error('Respuesta inválida al consultar solicitudes');
    return response.data;
  },
};
