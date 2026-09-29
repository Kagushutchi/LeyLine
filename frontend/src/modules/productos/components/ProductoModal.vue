<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-content producto-modal">
      <div class="modal-header">
        <h3 class="modal-title font-serif-title">
          {{ isEditing ? 'Modificar Producto' : 'Nuevo Producto' }}
        </h3>
        <button type="button" class="modal-close" @click="close">&times;</button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="modal-body">
          <div v-if="errorMessage" class="alert alert-danger">
            {{ errorMessage }}
          </div>

          <div class="form-group">
            <label for="prodNombre">Nombre del Producto / Etiqueta *</label>
            <input
              id="prodNombre"
              v-model="formData.nombre"
              type="text"
              placeholder="Ej. Gran Malbec Single Vineyard 2021"
              required
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="prodCategoria">Categoría de Nicho *</label>
              <select id="prodCategoria" v-model="formData.categoria" required>
                <option value="vinos">Vino de Finca</option>
                <option value="cafes">Café de Especialidad</option>
                <option value="cervezas">Cerveza Artesanal</option>
              </select>
            </div>
            <div class="form-group">
              <label for="tipo">Varietal / Proceso / Estilo *</label>
              <input
                id="tipo"
                v-model="formData.tipo"
                type="text"
                placeholder="Ej. Malbec Roble / Geisha Natural / Doble IPA"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="productor">Productor / Bodega / Tostador *</label>
              <input
                id="productor"
                v-model="formData.productor"
                type="text"
                placeholder="Ej. Bodega Norton / Finca La Cabaña"
                required
              />
            </div>
            <div class="form-group">
              <label for="sku">Código SKU / Referencia</label>
              <input
                id="sku"
                v-model="formData.sku"
                type="text"
                placeholder="VIN-MAL-2021-01"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="precioReferencia">Precio de Referencia ($)</label>
            <input
              id="precioReferencia"
              v-model.number="formData.precioReferencia"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej. 12500.00"
            />
          </div>

          <div class="form-group">
            <label for="perfilNotas">Notas de Cata / Perfil Organoléptico</label>
            <input
              id="perfilNotas"
              v-model="perfilNotasInput"
              type="text"
              placeholder="Ej. Ciruela madura, Vainilla, Chocolate amargo"
            />
            <span class="form-hint">Ingresa descriptores aromáticos separados por comas.</span>
          </div>

          <div class="form-group">
            <label for="alergenos">Alérgenos / Restricciones</label>
            <input
              id="alergenos"
              v-model="alergenosInput"
              type="text"
              placeholder="Ej. Contiene sulfitos, Sin TACC"
            />
          </div>

          <div class="form-group">
            <label for="descripcion">Descripción & Notas del Sommelier</label>
            <textarea
              id="descripcion"
              v-model="formData.descripcion"
              rows="3"
              placeholder="Crianza en barricas de roble francés, terroir de origen, notas de maridaje..."
            ></textarea>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input v-model="formData.activo" type="checkbox" />
              <span>Producto Activo en Inventario</span>
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="close">
            Cancelar
          </button>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Guardando...' : (isEditing ? 'Actualizar Producto' : 'Guardar Producto') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from 'vue';
import { ProductoDTO } from '../services/productos.service';

const props = defineProps<{
  isOpen: boolean;
  producto?: ProductoDTO | null;
  saving?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', data: Partial<ProductoDTO>): void;
}>();

const isEditing = ref(false);
const errorMessage = ref('');
const perfilNotasInput = ref('');
const alergenosInput = ref('');

const formData = reactive({
  nombre: '',
  categoria: 'vinos',
  tipo: '',
  productor: '',
  sku: '',
  precioReferencia: 0,
  descripcion: '',
  activo: true,
});

watch(
  () => props.producto,
  (newVal) => {
    if (newVal) {
      isEditing.value = true;
      formData.nombre = newVal.nombre || '';
      formData.categoria = newVal.categoria || 'vinos';
      formData.tipo = newVal.tipo || '';
      formData.productor = newVal.productor || '';
      formData.sku = newVal.sku || '';
      formData.precioReferencia = newVal.precioReferencia || 0;
      formData.descripcion = newVal.descripcion || '';
      formData.activo = newVal.activo !== false;
      perfilNotasInput.value = (newVal.perfilNotas || []).join(', ');
      alergenosInput.value = (newVal.alergenosRestricciones || []).join(', ');
    } else {
      isEditing.value = false;
      formData.nombre = '';
      formData.categoria = 'vinos';
      formData.tipo = '';
      formData.productor = '';
      formData.sku = '';
      formData.precioReferencia = 0;
      formData.descripcion = '';
      formData.activo = true;
      perfilNotasInput.value = '';
      alergenosInput.value = '';
    }
    errorMessage.value = '';
  },
  { immediate: true }
);

const close = () => {
  emit('close');
};

const handleSubmit = () => {
  if (!formData.nombre.trim() || !formData.tipo.trim() || !formData.productor.trim()) {
    errorMessage.value = 'El nombre, tipo y productor son obligatorios.';
    return;
  }

  const notasArray = perfilNotasInput.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const alergenosArray = alergenosInput.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const payload: Partial<ProductoDTO> = {
    nombre: formData.nombre.trim(),
    categoria: formData.categoria,
    tipo: formData.tipo.trim(),
    productor: formData.productor.trim(),
    sku: formData.sku.trim() || undefined,
    precioReferencia: Number(formData.precioReferencia) || undefined,
    descripcion: formData.descripcion.trim() || undefined,
    perfilNotas: notasArray,
    alergenosRestricciones: alergenosArray,
    activo: formData.activo,
  };

  emit('save', payload);
};
</script>

<style scoped>
.producto-modal {
  max-width: 640px;
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
