<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content recomendacion-modal">
      <div class="modal-header">
        <h3 class="modal-title font-serif-title">Recomendaciones para vos</h3>
        <button type="button" class="modal-close" @click="close">&times;</button>
      </div>

      <div class="modal-body">
        <p class="recomendacion-subtitulo">
          Según tus preferencias, estas cajas podrían gustarte.
        </p>

        <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

        <div v-if="recomendacionesConCaja.length" class="recomendaciones-lista">
          <div v-for="rec in recomendacionesConCaja" :key="rec.cajaMensualId" class="reco-card">
            <div class="reco-header">
              <span class="badge badge-accent">{{ formatCategoria(rec.caja.categoria) }}</span>
              <span class="reco-precio">
                ${{ Number(rec.caja.precioBase).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}
              </span>
            </div>
            <h4 class="reco-nombre">{{ rec.caja.nombre }}</h4>
            <p v-if="rec.motivo" class="reco-motivo">{{ rec.motivo }}</p>
            <button
              class="btn btn-primary btn-sm"
              :disabled="alreadySubscribed(rec.caja.id)"
              @click="suscribir(rec.caja.id)"
            >
              {{ alreadySubscribed(rec.caja.id) ? '✓ Ya Suscripto' : 'Suscribirme' }}
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="close">Cerrar</button>
        <button type="button" class="btn btn-primary" :disabled="loading" @click="generar">
          {{ loading ? 'Generando...' : recomendaciones.length ? 'Regenerar' : 'Generar recomendaciones' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { cajasMensualesService, CajaRecomendadaDTO, CajaMensualDTO } from '../services/cajas-mensuales.service';
import { useCajasMensualesStore } from '../store/cajas-mensuales.store';

const props = defineProps<{
  isOpen: boolean;
  suscripcionesActivas: string[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'suscribir', cajaMensualId: string): void;
}>();

const store = useCajasMensualesStore();

const loading = ref(false);
const errorMessage = ref('');
const recomendaciones = ref<CajaRecomendadaDTO[]>([]);

interface RecomendacionConCaja extends CajaRecomendadaDTO {
  caja: CajaMensualDTO;
}

const recomendacionesConCaja = computed(() =>
  recomendaciones.value
    .map((rec) => ({ ...rec, caja: store.cajas.find((caja) => caja.id === rec.cajaMensualId) }))
    .filter((item): item is RecomendacionConCaja => Boolean(item.caja))
);

watch(
  () => props.isOpen,
  (abierta) => {
    if (abierta) {
      recomendaciones.value = [];
      errorMessage.value = '';
    }
  },
  { immediate: true }
);

const close = () => emit('close');

const formatCategoria = (categoria: string) =>
  ({ vinos: 'Vinos', cafes: 'Cafés', cervezas: 'Cervezas' }[categoria] || categoria);

const alreadySubscribed = (cajaId: string) => props.suscripcionesActivas.includes(cajaId);

const suscribir = (cajaMensualId: string) => emit('suscribir', cajaMensualId);

const generar = async () => {
  errorMessage.value = '';
  loading.value = true;
  try {
    if (store.cajas.length === 0) {
      await store.fetchCajas();
    }
    const respuesta = await cajasMensualesService.recommendExistente();
    recomendaciones.value = Array.isArray(respuesta.data) ? respuesta.data : [];
  } catch (error) {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    errorMessage.value = e.response?.data?.message || e.message || 'No se pudieron generar las recomendaciones';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.recomendacion-modal {
  max-width: 560px;
}

.recomendacion-subtitulo {
  color: var(--color-dark);
  font-size: 0.95rem;
  margin: 0 0 1rem 0;
}

.recomendaciones-lista {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 1rem;
}

.reco-card {
  border: 1px solid var(--color-border);
  background-color: #faf8f6;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.reco-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reco-precio {
  font-weight: 700;
  color: var(--color-dark);
}

.reco-nombre {
  font-family: var(--font-serif);
  font-size: 1.05rem;
  color: var(--color-dark);
  margin: 0;
}

.reco-motivo {
  font-size: 0.82rem;
  color: var(--color-accent);
  margin: 0;
  line-height: 1.45;
}
</style>
