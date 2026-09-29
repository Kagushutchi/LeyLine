import { defineStore } from 'pinia';
import { ref } from 'vue';
import { cajasMensualesService, CajaMensualDTO } from '../services/cajas-mensuales.service';

export const useCajasMensualesStore = defineStore('cajasMensuales', () => {
  const cajas = ref<CajaMensualDTO[]>([]);
  const selectedCaja = ref<CajaMensualDTO | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const fetchCajas = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await cajasMensualesService.getAll();
      cajas.value = Array.isArray(response.data) ? response.data : [];
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al cargar cajas mensuales';
    } finally {
      loading.value = false;
    }
  };

  const getCajaById = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await cajasMensualesService.getById(id);
      selectedCaja.value = response.data;
      return response.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al obtener caja mensual';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createCaja = async (payload: Partial<CajaMensualDTO>) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await cajasMensualesService.create(payload);
      if (response.data) {
        cajas.value.unshift(response.data);
      }
      return response.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al crear caja mensual';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateCaja = async (id: string, payload: Partial<CajaMensualDTO>) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await cajasMensualesService.update(id, payload);
      const index = cajas.value.findIndex((c) => c.id === id);
      if (index !== -1 && response.data) {
        cajas.value[index] = { ...cajas.value[index], ...response.data };
      }
      return response.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al actualizar caja mensual';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteCaja = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      await cajasMensualesService.delete(id);
      cajas.value = cajas.value.filter((c) => c.id !== id);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al eliminar caja mensual';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    cajas,
    selectedCaja,
    loading,
    error,
    fetchCajas,
    getCajaById,
    createCaja,
    updateCaja,
    deleteCaja,
  };
});
