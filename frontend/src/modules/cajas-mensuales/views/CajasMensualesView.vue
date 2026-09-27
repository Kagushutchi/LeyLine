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
import { onMounted } from 'vue';
import { useCajasMensualesStore } from '../store/cajas-mensuales.store';

const store = useCajasMensualesStore();

onMounted(() => {
  store.fetchCajas();
});

const openCreateModal = () => {
  // TODO: Modal de creación de caja
  console.log('Abrir modal de caja mensual');
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
</style>
