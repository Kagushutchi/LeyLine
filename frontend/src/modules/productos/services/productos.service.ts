import { apiClient } from '@/common/api/http-client';

export interface ProductoDTO {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  tipo: string;
  productor: string;
  perfilNotas?: string[];
  alergenosRestricciones?: string[];
  sku?: string;
  precioReferencia?: number;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export const productosService = {
  async getAll(): Promise<ApiResponse<ProductoDTO[]>> {
    return apiClient.get('/productos');
  },

  async getById(id: string): Promise<ApiResponse<ProductoDTO>> {
    return apiClient.get(`/productos/${id}`);
  },

  async create(payload: Partial<ProductoDTO>): Promise<ApiResponse<ProductoDTO>> {
    return apiClient.post('/productos', payload);
  },

  async update(id: string, payload: Partial<ProductoDTO>): Promise<ApiResponse<ProductoDTO>> {
    return apiClient.put(`/productos/${id}`, payload);
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/productos/${id}`);
  },
};
