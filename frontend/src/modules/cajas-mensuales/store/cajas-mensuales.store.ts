import { defineStore } from 'pinia';
import { ref } from 'vue';
import { cajasMensualesService, type CajaMensualDTO } from '../services/cajas-mensuales.service';

export const useCajasMensualesStore = defineStore('cajasMensuales', () => {
  const cajas = ref<CajaMensualDTO[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchCajas = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await cajasMensualesService.getAll();
      cajas.value = response.data;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error al obtener catálogo de cajas';
    } finally {
      loading.value = false;
    }
  };

  return {
    cajas,
    loading,
    error,
    fetchCajas,
  };
});
