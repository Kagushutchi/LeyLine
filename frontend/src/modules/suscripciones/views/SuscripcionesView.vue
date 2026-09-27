<template>
  <div class="container">
    <div class="view-header">
      <div>
        <h1>Suscripciones (Pedidos Recurrentes)</h1>
        <p class="subtitle">Control de estados, periodicidad y cobros automáticos.</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        + Nueva Suscripción
      </button>
    </div>

    <!-- Estado de Carga -->
    <div v-if="store.loading" class="card loading-state">
      <p>Cargando suscripciones...</p>
    </div>

    <!-- Estado de Error -->
    <div v-else-if="store.error" class="card error-state">
      <p>Error: {{ store.error }}</p>
      <button class="btn btn-secondary" @click="store.fetchSuscripciones">Reintentar</button>
    </div>

    <!-- Lista vacía o contenido -->
    <div v-else-if="store.suscripciones.length === 0" class="card empty-state">
      <p>No hay suscripciones activas registradas.</p>
      <span class="text-muted">Crea una nueva suscripción asociada a un suscriptor para comenzar.</span>
    </div>

    <div v-else class="grid-cards">
      <div v-for="item in store.suscripciones" :key="item.id" class="card">
        <div class="card-header">
          <span class="badge badge-primary">{{ item.categoria }}</span>
          <span class="badge" :class="item.estado === 'activa' ? 'badge-success' : 'badge-warning'">
            {{ item.estado }}
          </span>
        </div>
        <h3>${{ Number(item.montoMensual).toLocaleString() }} / mes</h3>
        <p class="subscriber-info" v-if="item.suscriptor">
          <strong>Suscriptor:</strong> {{ item.suscriptor.nombre }} ({{ item.suscriptor.email }})
        </p>
        <div class="actions">
          <button class="btn btn-secondary btn-sm" @click="pauseSubscription(item.id)">
            Pausar
          </button>
          <button class="btn btn-secondary btn-sm" @click="cancelSubscription(item.id)">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useSuscripcionesStore } from '../store/suscripciones.store';

const store = useSuscripcionesStore();

onMounted(() => {
  store.fetchSuscripciones();
});

const openCreateModal = () => {
  // TODO: Modal de alta de suscripción
  console.log('Abrir modal de suscripción');
};

const pauseSubscription = (id: string) => {
  // TODO: Implementar pausa
  console.log('Pausar suscripción', id);
};

const cancelSubscription = (id: string) => {
  // TODO: Implementar cancelación
  console.log('Cancelar suscripción', id);
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
  margin-bottom: 1rem;
}

.subscriber-info {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0.75rem 0 1.25rem 0;
}

.actions {
  display: flex;
  gap: 0.5rem;
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
</style>
