import { defineStore } from 'pinia';
import { ref } from 'vue';
import { suscripcionesService, type SuscripcionDTO } from '../services/suscripciones.service';

export const useSuscripcionesStore = defineStore('suscripciones', () => {
  const suscripciones = ref<SuscripcionDTO[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchSuscripciones = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await suscripcionesService.getAll();
      suscripciones.value = response.data;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error al obtener suscripciones';
    } finally {
      loading.value = false;
    }
  };

  return {
    suscripciones,
    loading,
    error,
    fetchSuscripciones,
  };
});
