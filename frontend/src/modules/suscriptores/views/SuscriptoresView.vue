<template>
  <div class="container">
    <div class="view-header">
      <div>
        <h1>Suscriptores (Clientes)</h1>
        <p class="subtitle">Gestión de miembros y registro de preferencias organolépticas.</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        + Nuevo Suscriptor
      </button>
    </div>

    <div v-if="createOpen" class="modal-backdrop" @click.self="closeCreateModal">
      <section class="create-modal" role="dialog" aria-modal="true" aria-labelledby="subscriber-form-title">
        <div class="modal-header">
          <h2 id="subscriber-form-title">Nuevo suscriptor</h2>
          <button class="close-button" type="button" aria-label="Cerrar" @click="closeCreateModal">×</button>
        </div>
        <form class="create-form" @submit.prevent="createSuscriptor">
          <label>Nombre<input v-model.trim="form.nombre" required maxlength="150" autocomplete="name" /></label>
          <label>Email<input v-model.trim="form.email" type="email" required maxlength="150" autocomplete="email" /></label>
          <label>Teléfono<input v-model.trim="form.telefono" type="tel" maxlength="50" autocomplete="tel" /></label>
          <label>Club preferido
            <select v-model="form.categoria">
              <option value="vinos">Vinos</option>
              <option value="cafes">Cafés</option>
              <option value="cervezas">Cervezas</option>
            </select>
          </label>
          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
          <div class="form-actions">
            <button class="btn btn-secondary" type="button" @click="closeCreateModal">Cancelar</button>
            <button class="btn btn-primary" type="submit" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar suscriptor' }}</button>
          </div>
        </form>
      </section>
    </div>

    <!-- Estado de Carga -->
    <div v-if="store.loading" class="card loading-state">
      <p>Cargando lista de suscriptores...</p>
    </div>

    <!-- Estado de Error -->
    <div v-else-if="store.error" class="card error-state">
      <p>Error: {{ store.error }}</p>
      <button class="btn btn-secondary" @click="store.fetchSuscriptores">Reintentar</button>
    </div>

    <!-- Lista vacía o contenido -->
    <div v-else-if="store.suscriptores.length === 0" class="card empty-state">
      <p>No hay suscriptores registrados todavía.</p>
      <span class="text-muted">Utiliza el botón de arriba para registrar el primer suscriptor al club.</span>
    </div>

    <div v-else class="grid-cards">
      <div v-for="item in store.suscriptores" :key="item.id" class="card">
        <div class="card-header">
          <h3>{{ item.nombre }}</h3>
          <span class="badge" :class="item.activo ? 'badge-success' : 'badge-warning'">
            {{ item.activo ? 'Activo' : 'Inactivo' }}
          </span>
        </div>
        <p class="email">{{ item.email }}</p>
        <div v-if="item.preferenciasOrganolepticas" class="preferences-box">
          <strong>Club:</strong> {{ item.preferenciasOrganolepticas.categoria }}
          <div v-if="item.preferenciasOrganolepticas.perfilSabor?.length">
            <strong>Perfil:</strong> {{ item.preferenciasOrganolepticas.perfilSabor.join(', ') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useSuscriptoresStore } from '../store/suscriptores.store';

const store = useSuscriptoresStore();

onMounted(() => {
  store.fetchSuscriptores();
});

const createOpen = ref(false);
const saving = ref(false);
const formError = ref('');
const form = ref({ nombre: '', email: '', telefono: '', categoria: 'vinos' as 'vinos' | 'cafes' | 'cervezas' });

const openCreateModal = () => {
  formError.value = '';
  createOpen.value = true;
};

const closeCreateModal = () => {
  if (saving.value) return;
  createOpen.value = false;
};

const createSuscriptor = async () => {
  saving.value = true;
  formError.value = '';
  try {
    await store.createSuscriptor({
      nombre: form.value.nombre,
      email: form.value.email,
      telefono: form.value.telefono || undefined,
      preferenciasOrganolepticas: {
        categoria: form.value.categoria,
        perfilSabor: [],
        alergiasRestricciones: [],
      },
      activo: true,
    });
    form.value = { nombre: '', email: '', telefono: '', categoria: 'vinos' };
    createOpen.value = false;
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'No se pudo guardar el suscriptor.';
  } finally {
    saving.value = false;
  }
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
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.email {
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.preferences-box {
  background: rgba(0, 0, 0, 0.2);
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--text-secondary);
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
.create-form select {
  width: 100%;
  min-height: 2.6rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  background: var(--bg-primary);
  font: inherit;
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
