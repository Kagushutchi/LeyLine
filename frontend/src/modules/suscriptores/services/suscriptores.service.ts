import { apiClient } from '@/common/api/http-client';

export interface DireccionSuscriptor {
  calle?: string;
  numero?: string;
  piso?: string;
  departamento?: string;
  ciudad?: string;
  provincia?: string;
  codigoPostal?: string;
  pais?: string;
}

export interface PreferenciasOrganolepticas {
  categoria?: 'vinos' | 'cafes' | 'cervezas' | string;
  perfilSabor?: string[];
  intensidad?: string;
  alergiasRestricciones?: string[];
  notasAdicionales?: string;
}

export interface SuscriptorDTO {
  id: string;
  nombre: string;
  apellido?: string;
  email: string;
  telefono?: string;
  documento?: string;
  direccion?: DireccionSuscriptor;
  preferenciasOrganolepticas?: PreferenciasOrganolepticas;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export const suscriptoresService = {
  async getAll(): Promise<ApiResponse<SuscriptorDTO[]>> {
    return apiClient.get('/suscriptores');
  },

  async getById(id: string): Promise<ApiResponse<SuscriptorDTO>> {
    return apiClient.get(`/suscriptores/${id}`);
  },

  async create(payload: Partial<SuscriptorDTO>): Promise<ApiResponse<SuscriptorDTO>> {
    return apiClient.post('/suscriptores', payload);
  },

  async update(id: string, payload: Partial<SuscriptorDTO>): Promise<ApiResponse<SuscriptorDTO>> {
    return apiClient.put(`/suscriptores/${id}`, payload);
  },

  async delete(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete(`/suscriptores/${id}`);
  },
};
