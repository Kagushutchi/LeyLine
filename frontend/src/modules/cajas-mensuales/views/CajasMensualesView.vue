<template>
  <div class="container">
    <div class="view-header">
      <div>
        <h1>Cajas Mensuales (Productos)</h1>
        <p class="subtitle">Catálogo de cajas temáticas y combinaciones recomendadas por IA.</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        + Nueva Caja Mensual
      </button>
    </div>

    <div v-if="createOpen" class="modal-backdrop" @click.self="closeCreateModal">
      <section class="create-modal" role="dialog" aria-modal="true" aria-labelledby="box-form-title">
        <div class="modal-header">
          <h2 id="box-form-title">Nueva caja mensual</h2>
          <button class="close-button" type="button" aria-label="Cerrar" @click="closeCreateModal">×</button>
        </div>
        <form class="create-form" @submit.prevent="createCaja">
          <label>Nombre<input v-model.trim="form.nombre" required maxlength="150" /></label>
          <label>Categoría
            <select v-model="form.categoria">
              <option value="vinos">Vinos</option>
              <option value="cafes">Cafés</option>
              <option value="cervezas">Cervezas</option>
            </select>
          </label>
          <div class="period-fields">
            <label>Mes<input v-model.number="form.mes" type="number" min="1" max="12" required /></label>
            <label>Año<input v-model.number="form.anio" type="number" min="2000" required /></label>
          </div>
          <label>Precio base<input v-model.number="form.precioBase" type="number" min="0" step="0.01" required /></label>
          <label>Descripción<textarea v-model.trim="form.descripcion" rows="3" /></label>
          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
          <div class="form-actions">
            <button class="btn btn-secondary" type="button" @click="closeCreateModal">Cancelar</button>
            <button class="btn btn-primary" type="submit" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar caja' }}</button>
          </div>
        </form>
      </section>
    </div>

    <!-- Estado de Carga -->
    <div v-if="store.loading" class="card loading-state">
      <p>Cargando cajas mensuales...</p>
    </div>

    <!-- Estado de Error -->
    <div v-else-if="store.error" class="card error-state">
      <p>Error: {{ store.error }}</p>
      <button class="btn btn-secondary" @click="store.fetchCajas">Reintentar</button>
    </div>

    <!-- Lista vacía o contenido -->
    <div v-else-if="store.cajas.length === 0" class="card empty-state">
      <p>No hay cajas configuradas en el catálogo actual.</p>
      <span class="text-muted">Crea una caja mensual para el ciclo actual de suscripción.</span>
    </div>

    <div v-else class="grid-cards">
      <div v-for="item in store.cajas" :key="item.id" class="card">
        <div class="card-header">
          <span class="badge badge-primary">{{ item.categoria }}</span>
          <span class="badge badge-warning">Mes {{ item.mes }}/{{ item.anio }}</span>
        </div>
        <h3>{{ item.nombre }}</h3>
        <p class="description">{{ item.descripcion || 'Sin descripción disponible.' }}</p>
        <div class="card-footer">
          <span class="price">${{ Number(item.precioBase).toLocaleString() }}</span>
          <button class="btn btn-secondary btn-sm" @click="previewBox(item.id)">
            Detalles
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useCajasMensualesStore } from '../store/cajas-mensuales.store';

const store = useCajasMensualesStore();

onMounted(() => {
  store.fetchCajas();
});

const now = new Date();
const createOpen = ref(false);
const saving = ref(false);
const formError = ref('');
const form = ref({
  nombre: '',
  categoria: 'vinos' as 'vinos' | 'cafes' | 'cervezas',
  mes: now.getMonth() + 1,
  anio: now.getFullYear(),
  precioBase: 0,
  descripcion: '',
});

const openCreateModal = () => {
  formError.value = '';
  createOpen.value = true;
};

const closeCreateModal = () => {
  if (saving.value) return;
  createOpen.value = false;
};

const createCaja = async () => {
  saving.value = true;
  formError.value = '';
  try {
    await store.createCaja({
      ...form.value,
      descripcion: form.value.descripcion || undefined,
      disponible: true,
      items: [],
    });
    form.value = {
      nombre: '',
      categoria: 'vinos',
      mes: now.getMonth() + 1,
      anio: now.getFullYear(),
      precioBase: 0,
      descripcion: '',
    };
    createOpen.value = false;
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'No se pudo guardar la caja.';
  } finally {
    saving.value = false;
  }
};

const previewBox = (id: string) => {
  // TODO: Modal de detalle de caja y botellas
  console.log('Ver detalle de caja', id);
};
</script>

<style scoped>
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin-top: 0.25rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.description {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin: 0.75rem 0 1.25rem 0;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-color);
  padding-top: 0.75rem;
}

.price {
  font-weight: 700;
  font-size: 1.1rem;
  color: #fff;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem 1.5rem;
}

.text-muted {
  display: block;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 0.5rem;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(3, 8, 18, 0.72);
}

.create-modal {
  width: min(100%, 500px);
  max-height: min(90vh, 720px);
  overflow-y: auto;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  box-shadow: var(--shadow-lg);
}

.modal-header,
.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.modal-header {
  margin-bottom: 1.25rem;
}

.modal-header h2 {
  font-size: 1.25rem;
}

.close-button {
  width: 2rem;
  height: 2rem;
  color: var(--text-secondary);
  background: transparent;
  font-size: 1.5rem;
}

.create-form {
  display: grid;
  gap: 1rem;
}

.create-form label {
  display: grid;
  gap: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.create-form input,
.create-form select,
.create-form textarea {
  width: 100%;
  min-height: 2.6rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  background: var(--bg-primary);
  font: inherit;
}

.period-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-error {
  color: #fca5a5;
}

.form-actions {
  justify-content: flex-end;
  margin-top: 0.25rem;
}

.form-actions button:disabled {
  cursor: wait;
  opacity: 0.65;
}

@media (max-width: 480px) {
  .form-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }
}
</style>
