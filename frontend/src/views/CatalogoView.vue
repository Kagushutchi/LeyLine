<template>
  <div class="container">
    <div class="view-header">
      <div>
        <h1 class="view-title">Mi Catálogo de Cajas</h1>
        <p class="view-subtitle">Explorar las cajas mensuales disponibles en tu club de membresía.</p>
      </div>
    </div>

    <div v-if="store.loading" class="state-box">
      <h3 class="state-title">Cargando catálogo</h3>
      <p class="state-desc">Recuperando cajas disponibles...</p>
    </div>

    <div v-else-if="store.error && store.cajas.length === 0" class="state-box">
      <h3 class="state-title">Error al consultar datos</h3>
      <p class="state-desc">{{ store.error }}</p>
      <button class="btn btn-secondary" @click="store.fetchCajas">Reintentar</button>
    </div>

    <div v-else-if="store.cajas.length === 0" class="state-box">
      <h3 class="state-title">No hay cajas disponibles</h3>
      <p class="state-desc">Pronto habrá nuevas cajas mensuales para tu membresía.</p>
    </div>

    <div v-else class="cajas-grid">
      <div v-for="caja in store.cajas" :key="caja.id" class="caja-card">
        <div class="caja-header">
          <span class="badge badge-accent">{{ formatCategoria(caja.categoria) }}</span>
          <span class="periodo-tag">{{ caja.mes }}/{{ caja.anio }}</span>
        </div>
        <h2 class="caja-nombre">{{ caja.nombre }}</h2>
        <p v-if="caja.descripcion" class="caja-desc">{{ caja.descripcion }}</p>
        <div class="caja-price">
          ${{ Number(caja.precioBase).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }} / mes
        </div>
        <div v-if="caja.composiciones?.length" class="composiciones-list">
          <span class="comp-label">Incluye:</span>
          <div
            v-for="comp in caja.composiciones.slice(0, 3)"
            :key="comp.id"
            class="comp-item"
          >
            {{ comp.producto?.nombre }}
          </div>
        </div>
        <div class="caja-footer">
          <span class="disponible-badge" :class="caja.disponible ? 'badge-success' : 'badge-warning'">
            {{ caja.disponible ? 'Disponible' : 'Agotada' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useCajasMensualesStore } from '@/modules/cajas-mensuales/store/cajas-mensuales.store';

const store = useCajasMensualesStore();

onMounted(() => store.fetchCajas());

const formatCategoria = (cat: string) =>
  ({ vinos: '🍷 Vinos', cafes: '☕ Cafés', cervezas: '🍺 Cervezas' }[cat] || cat);
</script>

<style scoped>
.cajas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.caja-card {
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: box-shadow var(--transition-fast);
}

.caja-card:hover {
  box-shadow: 0 4px 16px rgba(2, 2, 1, 0.08);
}

.caja-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.periodo-tag {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-accent);
  letter-spacing: 0.05em;
}

.caja-nombre {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  color: var(--color-dark);
  margin: 0;
  line-height: 1.3;
}

.caja-desc {
  font-size: 0.825rem;
  color: var(--color-accent);
  margin: 0;
  line-height: 1.5;
}

.caja-price {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-dark);
  margin-top: 0.25rem;
}

.composiciones-list {
  font-size: 0.8rem;
  color: var(--color-dark);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.comp-label {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.72rem;
  color: var(--color-accent);
}

.comp-item {
  padding-left: 0.5rem;
  border-left: 2px solid var(--color-border);
}

.caja-footer {
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.disponible-badge {
  font-size: 0.775rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  display: inline-block;
}
</style>

