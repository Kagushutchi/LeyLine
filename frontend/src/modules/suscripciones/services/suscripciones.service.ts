import { apiClient } from '@/common/api/http-client';
import { SuscriptorDTO } from '../../suscriptores/services/suscriptores.service';
import { CajaMensualDTO } from '../../cajas-mensuales/services/cajas-mensuales.service';

export type EstadoSuscripcion = 'activa' | 'pausada' | 'cancelada';
export type CategoriaClub = 'vinos' | 'cafes' | 'cervezas';

export interface SuscripcionDTO {
  id: string;
  suscriptorId: string;
  cajaMensualId: string;
  categoria: CategoriaClub;
  estado: EstadoSuscripcion;
  montoMensual: number;
  fechaInicio?: string;
  proximoCobro?: string;
  suscriptor?: SuscriptorDTO;
  cajaMensual?: CajaMensualDTO;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export const suscripcionesService = {
  async getAll(): Promise<ApiResponse<SuscripcionDTO[]>> {
    return apiClient.get('/suscripciones');
  },

  async getById(id: string): Promise<ApiResponse<SuscripcionDTO>> {
    return apiClient.get(`/suscripciones/${id}`);
  },

  async getBySuscriptor(suscriptorId: string): Promise<ApiResponse<SuscripcionDTO[]>> {
    return apiClient.get(`/suscripciones/suscriptor/${suscriptorId}`);
  },

  async create(payload: Partial<SuscripcionDTO>): Promise<ApiResponse<SuscripcionDTO>> {
    return apiClient.post('/suscripciones', payload);
  },

  async update(id: string, payload: Partial<SuscripcionDTO>): Promise<ApiResponse<SuscripcionDTO>> {
    return apiClient.put(`/suscripciones/${id}`, payload);
  },

  async pause(id: string): Promise<ApiResponse<SuscripcionDTO>> {
    return apiClient.patch(`/suscripciones/${id}/pausar`);
  },

  async cancel(id: string): Promise<ApiResponse<SuscripcionDTO>> {
    return apiClient.patch(`/suscripciones/${id}/cancelar`);
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/suscripciones/${id}`);
  },
};
