<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content caja-modal">
      <div class="modal-header">
        <h3 class="modal-title font-serif-title">
          {{ isEditing ? 'Modificar Caja Mensual' : 'Nueva Caja Mensual' }}
        </h3>
        <button type="button" class="modal-close" @click="close">&times;</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body">
          <div v-if="errorMessage" class="alert alert-danger">
            {{ errorMessage }}
          </div>

          <div class="form-group">
            <label for="cajaNombre">Nombre de la Selección *</label>
            <input
              id="cajaNombre"
              v-model="formData.nombre"
              type="text"
              placeholder="Ej. Colección Reserva de Altura - Octubre"
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="cajaCategoria">Categoría *</label>
              <select id="cajaCategoria" v-model="formData.categoria" required>
                <option value="vinos">Vinos de Selección</option>
                <option value="cafes">Café de Especialidad</option>
                <option value="cervezas">Cervezas Artesanales</option>
              </select>
            </div>
            <div class="form-group">
              <label for="precioBase">Precio Base ($) *</label>
              <input
                id="precioBase"
                v-model.number="formData.precioBase"
                type="number"
                step="0.01"
                min="0"
                placeholder="18500.00"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="mes">Mes (1-12) *</label>
              <select id="mes" v-model.number="formData.mes" required>
                <option v-for="(name, index) in meses" :key="index + 1" :value="index + 1">
                  {{ index + 1 }} - {{ name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="anio">Año *</label>
              <input
                id="anio"
                v-model.number="formData.anio"
                type="number"
                min="2020"
                max="2035"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label for="descripcion">Descripción de Curaduría / Notas de Cata</label>
            <textarea
              id="descripcion"
              v-model="formData.descripcion"
              rows="3"
              placeholder="Detalle de los varietales seleccionados, orígenes o método de elaboración..."
            ></textarea>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input v-model="formData.disponible" type="checkbox" />
              <span>Disponible para suscripciones y envíos</span>
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Guardando...' : (isEditing ? 'Actualizar Caja' : 'Guardar Caja') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import { CajaMensualDTO } from '../services/cajas-mensuales.service';

const props = defineProps<{
  isOpen: boolean;
  caja?: CajaMensualDTO | null;
  saving?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', data: Partial<CajaMensualDTO>): void;
}>();

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const isEditing = ref(false);
const errorMessage = ref('');

const currentDate = new Date();
const formData = reactive({
  nombre: '',
  categoria: 'vinos' as 'vinos' | 'cafes' | 'cervezas',
  mes: currentDate.getMonth() + 1,
  anio: currentDate.getFullYear(),
  precioBase: 0,
  descripcion: '',
  disponible: true,
});

watch(
  () => props.caja,
  (newVal) => {
    if (newVal) {
      isEditing.value = true;
      formData.nombre = newVal.nombre || '';
      formData.categoria = newVal.categoria || 'vinos';
      formData.mes = newVal.mes || (currentDate.getMonth() + 1);
      formData.anio = newVal.anio || currentDate.getFullYear();
      formData.precioBase = newVal.precioBase || 0;
      formData.descripcion = newVal.descripcion || '';
      formData.disponible = newVal.disponible !== false;
    } else {
      isEditing.value = false;
      formData.nombre = '';
      formData.categoria = 'vinos';
      formData.mes = currentDate.getMonth() + 1;
      formData.anio = currentDate.getFullYear();
      formData.precioBase = 0;
      formData.descripcion = '';
      formData.disponible = true;
    }
    errorMessage.value = '';
  },
  { immediate: true }
);

const close = () => {
  emit('close');
};

const handleSubmit = () => {
  if (!formData.nombre.trim()) {
    errorMessage.value = 'El nombre de la caja mensual es obligatorio.';
    return;
  }
  if (formData.precioBase < 0) {
    errorMessage.value = 'El precio base no puede ser negativo.';
    return;
  }

  const payload: Partial<CajaMensualDTO> = {
    nombre: formData.nombre.trim(),
    categoria: formData.categoria,
    mes: Number(formData.mes),
    anio: Number(formData.anio),
    precioBase: Number(formData.precioBase),
    descripcion: formData.descripcion.trim() || undefined,
    disponible: formData.disponible,
  };

  emit('save', payload);
};
</script>

<style scoped>
.caja-modal {
  max-width: 600px;
}

.checkbox-group {
  margin-top: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  width: auto;
  accent-color: var(--color-dark);
}
</style>
