import { defineStore } from 'pinia';
import { ref } from 'vue';
import { suscripcionesService, SuscripcionDTO } from '../services/suscripciones.service';

export const useSuscripcionesStore = defineStore('suscripciones', () => {
  const suscripciones = ref<SuscripcionDTO[]>([]);
  const selectedSuscripcion = ref<SuscripcionDTO | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const fetchSuscripciones = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await suscripcionesService.getAll();
      suscripciones.value = Array.isArray(response.data) ? response.data : [];
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al cargar suscripciones';
    } finally {
      loading.value = false;
    }
  };

  const getSuscripcionById = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await suscripcionesService.getById(id);
      selectedSuscripcion.value = response.data;
      return response.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al obtener suscripción';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createSuscripcion = async (payload: Partial<SuscripcionDTO>) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await suscripcionesService.create(payload);
      if (response.data) {
        suscripciones.value.unshift(response.data);
      }
      return response.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al crear suscripción';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateSuscripcion = async (id: string, payload: Partial<SuscripcionDTO>) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await suscripcionesService.update(id, payload);
      const index = suscripciones.value.findIndex((s) => s.id === id);
      if (index !== -1 && response.data) {
        suscripciones.value[index] = { ...suscripciones.value[index], ...response.data };
      }
      return response.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al actualizar suscripción';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const pauseSuscripcion = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await suscripcionesService.pause(id);
      const index = suscripciones.value.findIndex((s) => s.id === id);
      if (index !== -1 && response.data) {
        suscripciones.value[index] = { ...suscripciones.value[index], ...response.data, estado: 'pausada' };
      }
      return response.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al pausar suscripción';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const cancelSuscripcion = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await suscripcionesService.cancel(id);
      const index = suscripciones.value.findIndex((s) => s.id === id);
      if (index !== -1 && response.data) {
        suscripciones.value[index] = { ...suscripciones.value[index], ...response.data, estado: 'cancelada' };
      }
      return response.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al cancelar suscripción';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteSuscripcion = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      await suscripcionesService.delete(id);
      suscripciones.value = suscripciones.value.filter((s) => s.id !== id);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al eliminar suscripción';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    suscripciones,
    selectedSuscripcion,
    loading,
    error,
    fetchSuscripciones,
    getSuscripcionById,
    createSuscripcion,
    updateSuscripcion,
    pauseSuscripcion,
    cancelSuscripcion,
    deleteSuscripcion,
  };
});
