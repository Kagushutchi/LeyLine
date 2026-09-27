import { apiClient } from '@/common/api/http-client';

export interface SuscriptorDTO {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  preferenciasOrganolepticas?: {
    categoria: 'vinos' | 'cafes' | 'cervezas';
    perfilSabor: string[];
    alergiasRestricciones: string[];
    notasAdicionales?: string;
  };
  activo: boolean;
  createdAt: string;
}

export const suscriptoresService = {
  async getAll(): Promise<{ status: string; data: SuscriptorDTO[] }> {
    return apiClient.get('/suscriptores');
  },

  async getById(id: string): Promise<{ status: string; data: SuscriptorDTO }> {
    return apiClient.get(`/suscriptores/${id}`);
  },

  async create(payload: Partial<SuscriptorDTO>): Promise<{ status: string; data: SuscriptorDTO }> {
    return apiClient.post('/suscriptores', payload);
  },

  async updatePreferences(id: string, preferencias: SuscriptorDTO['preferenciasOrganolepticas']): Promise<{ status: string; data: SuscriptorDTO }> {
    return apiClient.patch(`/suscriptores/${id}/preferencias`, preferencias);
  },
};
