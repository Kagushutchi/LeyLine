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
import { onMounted } from 'vue';
import { useSuscriptoresStore } from '../store/suscriptores.store';

const store = useSuscriptoresStore();

onMounted(() => {
  store.fetchSuscriptores();
});

const openCreateModal = () => {
  // TODO: Conectar modal o formulario para creación de suscriptores
  console.log('Abrir modal de creación de suscriptor');
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
</style>
