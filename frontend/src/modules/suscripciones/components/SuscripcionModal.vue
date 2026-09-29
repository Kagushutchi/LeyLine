<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content suscripcion-modal">
      <div class="modal-header">
        <h3 class="modal-title font-serif-title">
          {{ isEditing ? 'Modificar Suscripción' : 'Nueva Suscripción' }}
        </h3>
        <button type="button" class="modal-close" @click="close">&times;</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body">
          <div v-if="errorMessage" class="alert alert-danger">
            {{ errorMessage }}
          </div>

          <div class="form-group">
            <label for="suscriptorSelect">Suscriptor (Miembro) *</label>
            <select
              v-if="suscriptoresList.length > 0"
              id="suscriptorSelect"
              v-model="formData.suscriptorId"
              required
            >
              <option value="" disabled>Seleccione un suscriptor</option>
              <option v-for="s in suscriptoresList" :key="s.id" :value="s.id">
                {{ s.nombre }} {{ s.apellido || '' }} ({{ s.email }})
              </option>
            </select>
            <input
              v-else
              id="suscriptorSelect"
              v-model="formData.suscriptorId"
              type="text"
              placeholder="UUID de Suscriptor"
              required
            />
          </div>

          <div class="form-group">
            <label for="cajaSelect">Caja Mensual Asignada *</label>
            <select
              v-if="cajasList.length > 0"
              id="cajaSelect"
              v-model="formData.cajaMensualId"
              required
            >
              <option value="" disabled>Seleccione una caja mensual</option>
              <option v-for="c in cajasList" :key="c.id" :value="c.id">
                {{ c.nombre }} ({{ c.categoria }} - ${{ c.precioBase }})
              </option>
            </select>
            <input
              v-else
              id="cajaSelect"
              v-model="formData.cajaMensualId"
              type="text"
              placeholder="UUID de Caja Mensual"
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="categoria">Categoría de Club *</label>
              <select id="categoria" v-model="formData.categoria" required>
                <option value="vinos">Vinos de Selección</option>
                <option value="cafes">Café de Especialidad</option>
                <option value="cervezas">Cervezas Artesanales</option>
              </select>
            </div>
            <div class="form-group">
              <label for="estado">Estado Inicial</label>
              <select id="estado" v-model="formData.estado">
                <option value="activa">Activa</option>
                <option value="pausada">Pausada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="montoMensual">Monto Mensual ($) *</label>
              <input
                id="montoMensual"
                v-model.number="formData.montoMensual"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ej. 18500.00"
                required
              />
            </div>
            <div class="form-group">
              <label for="fechaInicio">Fecha de Inicio</label>
              <input
                id="fechaInicio"
                v-model="formData.fechaInicio"
                type="date"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="proximoCobro">Fecha de Próximo Cobro</label>
            <input
              id="proximoCobro"
              v-model="formData.proximoCobro"
              type="date"
            />
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Guardando...' : (isEditing ? 'Actualizar Suscripción' : 'Crear Suscripción') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import { SuscripcionDTO, EstadoSuscripcion, CategoriaClub } from '../services/suscripciones.service';
import { SuscriptorDTO } from '../../suscriptores/services/suscriptores.service';
import { CajaMensualDTO } from '../../cajas-mensuales/services/cajas-mensuales.service';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    suscripcion?: SuscripcionDTO | null;
    suscriptoresList?: SuscriptorDTO[];
    cajasList?: CajaMensualDTO[];
    saving?: boolean;
  }>(),
  {
    suscriptoresList: () => [],
    cajasList: () => [],
    saving: false,
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', data: Partial<SuscripcionDTO>): void;
}>();

const isEditing = ref(false);
const errorMessage = ref('');

const formData = reactive({
  suscriptorId: '',
  cajaMensualId: '',
  categoria: 'vinos' as CategoriaClub,
  estado: 'activa' as EstadoSuscripcion,
  montoMensual: 0,
  fechaInicio: '',
  proximoCobro: '',
});

watch(
  () => props.suscripcion,
  (newVal) => {
    if (newVal) {
      isEditing.value = true;
      formData.suscriptorId = newVal.suscriptorId || '';
      formData.cajaMensualId = newVal.cajaMensualId || '';
      formData.categoria = newVal.categoria || 'vinos';
      formData.estado = newVal.estado || 'activa';
      formData.montoMensual = newVal.montoMensual || 0;
      formData.fechaInicio = newVal.fechaInicio ? String(newVal.fechaInicio).split('T')[0] : '';
      formData.proximoCobro = newVal.proximoCobro ? String(newVal.proximoCobro).split('T')[0] : '';
    } else {
      isEditing.value = false;
      formData.suscriptorId = props.suscriptoresList[0]?.id || '';
      formData.cajaMensualId = props.cajasList[0]?.id || '';
      formData.categoria = 'vinos';
      formData.estado = 'activa';
      formData.montoMensual = 0;
      formData.fechaInicio = new Date().toISOString().split('T')[0];
      formData.proximoCobro = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
    errorMessage.value = '';
  },
  { immediate: true }
);

const close = () => {
  emit('close');
};

const handleSubmit = () => {
  if (!formData.suscriptorId || !formData.cajaMensualId) {
    errorMessage.value = 'Debe seleccionar un suscriptor y una caja mensual.';
    return;
  }
  if (formData.montoMensual < 0) {
    errorMessage.value = 'El monto mensual debe ser mayor o igual a 0.';
    return;
  }

  const payload: Partial<SuscripcionDTO> = {
    suscriptorId: formData.suscriptorId,
    cajaMensualId: formData.cajaMensualId,
    categoria: formData.categoria,
    estado: formData.estado,
    montoMensual: Number(formData.montoMensual),
    fechaInicio: formData.fechaInicio || undefined,
    proximoCobro: formData.proximoCobro || undefined,
  };

  emit('save', payload);
};
</script>

<style scoped>
.suscripcion-modal {
  max-width: 600px;
}
</style>
