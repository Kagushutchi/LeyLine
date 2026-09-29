import { apiClient } from '@/common/api/http-client';
import { ProductoDTO } from '../../productos/services/productos.service';

export interface CajaMensualProductoDTO {
  id?: string;
  cajaMensualId?: string;
  productoId: string;
  cantidad: number;
  orden?: number;
  precioAplicado?: number;
  producto?: ProductoDTO;
}

export interface CajaMensualDTO {
  id: string;
  nombre: string;
  categoria: 'vinos' | 'cafes' | 'cervezas';
  mes: number;
  anio: number;
  descripcion?: string;
  precioBase: number;
  disponible: boolean;
  composiciones?: CajaMensualProductoDTO[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export const cajasMensualesService = {
  async getAll(): Promise<ApiResponse<CajaMensualDTO[]>> {
    return apiClient.get('/cajas-mensuales');
  },

  async getById(id: string): Promise<ApiResponse<CajaMensualDTO>> {
    return apiClient.get(`/cajas-mensuales/${id}`);
  },

  async getByPeriodo(anio: number, mes: number): Promise<ApiResponse<CajaMensualDTO[]>> {
    return apiClient.get(`/cajas-mensuales/periodo/${anio}/${mes}`);
  },

  async create(payload: Partial<CajaMensualDTO>): Promise<ApiResponse<CajaMensualDTO>> {
    return apiClient.post('/cajas-mensuales', payload);
  },

  async update(id: string, payload: Partial<CajaMensualDTO>): Promise<ApiResponse<CajaMensualDTO>> {
    return apiClient.put(`/cajas-mensuales/${id}`, payload);
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/cajas-mensuales/${id}`);
  },

  async recommend(suscriptorId: string, preferencias: unknown): Promise<ApiResponse<Partial<CajaMensualDTO>>> {
    return apiClient.post('/cajas-mensuales/recomendar', { suscriptorId, preferencias });
  },
};
