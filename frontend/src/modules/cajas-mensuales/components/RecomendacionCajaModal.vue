<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content recomendacion-modal">
      <div class="modal-header">
        <h3 class="modal-title font-serif-title">Recomendación con IA</h3>
        <button type="button" class="modal-close" @click="close">&times;</button>
      </div>

      <div class="modal-body">
        <p v-if="suscriptor" class="recomendacion-subtitulo">
          Caja personalizada para <strong>{{ suscriptor.nombre }} {{ suscriptor.apellido || '' }}</strong>
        </p>

        <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

        <div v-if="recomendacion" class="recomendacion-resultado">
          <h4 class="resultado-nombre">{{ recomendacion.nombre }}</h4>
          <p v-if="recomendacion.descripcion" class="resultado-descripcion">
            {{ recomendacion.descripcion }}
          </p>
          <div class="resultado-precio">
            ${{ Number(recomendacion.precioBase).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}
          </div>
          <ul v-if="recomendacion.composiciones?.length" class="resultado-composiciones">
            <li v-for="comp in recomendacion.composiciones" :key="comp.productoId">
              <span class="comp-cantidad">{{ comp.cantidad }}×</span>
              <span class="comp-nombre">{{ comp.productoNombre }}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="close">Cerrar</button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="loading || !suscriptor"
          @click="generar"
        >
          {{ loading ? 'Generando...' : recomendacion ? 'Regenerar' : 'Generar recomendación' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { cajasMensualesService, RecomendacionCajaDTO } from '../services/cajas-mensuales.service';
import type { SuscriptorDTO } from '@/modules/suscriptores/services/suscriptores.service';

const props = defineProps<{
  isOpen: boolean;
  suscriptor: SuscriptorDTO | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const loading = ref(false);
const errorMessage = ref('');
const recomendacion = ref<RecomendacionCajaDTO | null>(null);

watch(
  () => props.isOpen,
  (abierta) => {
    if (abierta) {
      recomendacion.value = null;
      errorMessage.value = '';
    }
  },
  { immediate: true }
);

const close = () => emit('close');

const generar = async () => {
  if (!props.suscriptor) return;

  errorMessage.value = '';
  loading.value = true;
  try {
    const respuesta = await cajasMensualesService.recommend(
      props.suscriptor.id,
      props.suscriptor.preferenciasOrganolepticas
    );
    recomendacion.value = respuesta.data;
  } catch (error) {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    errorMessage.value = e.response?.data?.message || e.message || 'No se pudo generar la recomendación';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.recomendacion-modal {
  max-width: 520px;
}

.recomendacion-subtitulo {
  color: var(--color-dark);
  font-size: 0.95rem;
  margin: 0 0 1rem 0;
}

.recomendacion-resultado {
  border: 1px solid var(--color-border);
  background-color: #faf8f6;
  padding: 1.25rem;
  margin-top: 1rem;
}

.resultado-nombre {
  font-family: var(--font-serif);
  font-size: 1.15rem;
  color: var(--color-dark);
  margin: 0 0 0.5rem 0;
}

.resultado-descripcion {
  font-size: 0.85rem;
  color: var(--color-accent);
  line-height: 1.5;
  margin: 0 0 0.75rem 0;
}

.resultado-precio {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-dark);
  margin-bottom: 0.75rem;
}

.resultado-composiciones {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.resultado-composiciones li {
  display: flex;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-dark);
}

.comp-cantidad {
  font-weight: 700;
  color: var(--color-accent);
}
</style>
