import { apiClient } from '@/common/api/http-client';

export interface VariedadItemDTO {
  nombre: string;
  productorBodega: string;
  tipo: string;
  perfilNotas: string[];
  cantidad: number;
}

export interface CajaMensualDTO {
  id: string;
  nombre: string;
  categoria: 'vinos' | 'cafes' | 'cervezas';
  mes: number;
  anio: number;
  descripcion?: string;
  precioBase: number;
  items?: VariedadItemDTO[];
  disponible: boolean;
}

export const cajasMensualesService = {
  async getAll(): Promise<{ status: string; data: CajaMensualDTO[] }> {
    return apiClient.get('/cajas-mensuales');
  },

  async getById(id: string): Promise<{ status: string; data: CajaMensualDTO }> {
    return apiClient.get(`/cajas-mensuales/${id}`);
  },

  async create(payload: Partial<CajaMensualDTO>): Promise<{ status: string; data: CajaMensualDTO }> {
    return apiClient.post('/cajas-mensuales', payload);
  },

  async recommend(suscriptorId: string, preferencias: unknown): Promise<{ status: string; data: Partial<CajaMensualDTO> }> {
    return apiClient.post('/cajas-mensuales/recomendar', { suscriptorId, preferencias });
  },
};
