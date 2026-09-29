import { defineStore } from 'pinia';
import { ref } from 'vue';
import { suscriptoresService, SuscriptorDTO } from '../services/suscriptores.service';

export const useSuscriptoresStore = defineStore('suscriptores', () => {
  const suscriptores = ref<SuscriptorDTO[]>([]);
  const selectedSuscriptor = ref<SuscriptorDTO | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const fetchSuscriptores = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await suscriptoresService.getAll();
      suscriptores.value = Array.isArray(response.data) ? response.data : [];
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al cargar suscriptores';
    } finally {
      loading.value = false;
    }
  };

  const getSuscriptorById = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await suscriptoresService.getById(id);
      selectedSuscriptor.value = response.data;
      return response.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al obtener suscriptor';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createSuscriptor = async (payload: Partial<SuscriptorDTO>) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await suscriptoresService.create(payload);
      if (response.data) {
        suscriptores.value.unshift(response.data);
      }
      return response.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al crear suscriptor';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateSuscriptor = async (id: string, payload: Partial<SuscriptorDTO>) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await suscriptoresService.update(id, payload);
      const index = suscriptores.value.findIndex((s) => s.id === id);
      if (index !== -1 && response.data) {
        suscriptores.value[index] = response.data;
      }
      return response.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al actualizar suscriptor';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteSuscriptor = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      await suscriptoresService.delete(id);
      suscriptores.value = suscriptores.value.filter((s) => s.id !== id);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al eliminar suscriptor';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    suscriptores,
    selectedSuscriptor,
    loading,
    error,
    fetchSuscriptores,
    getSuscriptorById,
    createSuscriptor,
    updateSuscriptor,
    deleteSuscriptor,
  };
});
