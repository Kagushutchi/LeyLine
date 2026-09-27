import { defineStore } from 'pinia';
import { ref } from 'vue';
import { suscriptoresService, type SuscriptorDTO } from '../services/suscriptores.service';

export const useSuscriptoresStore = defineStore('suscriptores', () => {
  const suscriptores = ref<SuscriptorDTO[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchSuscriptores = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await suscriptoresService.getAll();
      suscriptores.value = response.data;
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Error al obtener suscriptores';
    } finally {
      loading.value = false;
    }
  };

  return {
    suscriptores,
    loading,
    error,
    fetchSuscriptores,
  };
});
