import { apiClient } from '@/common/api/http-client';

export interface SuscripcionDTO {
  id: string;
  suscriptorId: string;
  categoria: 'vinos' | 'cafes' | 'cervezas';
  estado: 'activa' | 'pausada' | 'cancelada';
  montoMensual: number;
  fechaInicio?: string;
  proximoCobro?: string;
  suscriptor?: {
    nombre: string;
    email: string;
  };
}

export const suscripcionesService = {
  async getAll(): Promise<{ status: string; data: SuscripcionDTO[] }> {
    return apiClient.get('/suscripciones');
  },

  async getById(id: string): Promise<{ status: string; data: SuscripcionDTO }> {
    return apiClient.get(`/suscripciones/${id}`);
  },

  async create(payload: Partial<SuscripcionDTO>): Promise<{ status: string; data: SuscripcionDTO }> {
    return apiClient.post('/suscripciones', payload);
  },

  async pause(id: string): Promise<{ status: string; data: SuscripcionDTO }> {
    return apiClient.patch(`/suscripciones/${id}/pausar`);
  },

  async cancel(id: string): Promise<{ status: string; data: SuscripcionDTO }> {
    return apiClient.patch(`/suscripciones/${id}/cancelar`);
  },
};
