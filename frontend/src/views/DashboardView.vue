<template>
  <div class="container">
    <div class="dashboard-hero">
      <div class="brand-eyebrow">Plataforma de Curaduría & Membresías</div>
      <h1 class="hero-title font-serif-title">Panel de Control ClubCurator</h1>
      <p class="hero-description">
        Gestión integral para clubes de suscripción de vinos de autor, cafés de especialidad y cervezas artesanales.
      </p>
    </div>

    <!-- Quick Module Cards -->
    <div class="dashboard-grid">
      <router-link to="/suscriptores" class="luxury-card module-card">
        <div class="module-header">
          <span class="badge badge-dark">Clientes</span>
          <span class="module-arrow">&rarr;</span>
        </div>
        <h3 class="module-title font-serif-title">Suscriptores</h3>
        <p class="module-description">
          Alta, modificación y registro de preferencias organolépticas, notas de cata y direcciones de entrega.
        </p>
        <div class="module-action">Administrar Suscriptores</div>
      </router-link>

      <router-link to="/suscripciones" class="luxury-card module-card">
        <div class="module-header">
          <span class="badge badge-accent">Recurrencia</span>
          <span class="module-arrow">&rarr;</span>
        </div>
        <h3 class="module-title font-serif-title">Suscripciones</h3>
        <p class="module-description">
          Control del ciclo de facturación, sincronización de cobros mensuales, pausas y cancelaciones de membresías.
        </p>
        <div class="module-action">Gestionar Membresías</div>
      </router-link>

      <router-link to="/cajas-mensuales" class="luxury-card module-card">
        <div class="module-header">
          <span class="badge badge-dark">Catálogo</span>
          <span class="module-arrow">&rarr;</span>
        </div>
        <h3 class="module-title font-serif-title">Cajas Mensuales</h3>
        <p class="module-description">
          Curaduría temática por período (mes/año), fijación de precios base y disponibilidad de selecciones.
        </p>
        <div class="module-action">Configurar Cajas</div>
      </router-link>

      <router-link to="/productos" class="luxury-card module-card">
        <div class="module-header">
          <span class="badge badge-accent">Inventario</span>
          <span class="module-arrow">&rarr;</span>
        </div>
        <h3 class="module-title font-serif-title">Productos & Bodega</h3>
        <p class="module-description">
          Inventario de botellas, microlotes de café, variedades lupuladas, descriptores sensoriales y SKU.
        </p>
        <div class="module-action">Explorar Inventario</div>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// Dashboard View con diseño de lujo
</script>

<style scoped>
.dashboard-hero {
  margin-bottom: 2.5rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--color-border);
}

.brand-eyebrow {
  font-size: 0.775rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-accent);
  margin-bottom: 0.5rem;
}

.hero-title {
  font-size: 2.5rem;
  color: var(--color-dark);
  line-height: 1.15;
  margin-bottom: 0.75rem;
}

.hero-description {
  color: var(--color-muted);
  font-size: 1.05rem;
  max-width: 680px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 1.5rem;
}

.module-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-decoration: none;
  min-height: 220px;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.module-arrow {
  font-size: 1.25rem;
  color: var(--color-accent);
  transition: transform var(--transition-fast);
}

.module-card:hover .module-arrow {
  transform: translateX(4px);
  color: var(--color-dark);
}

.module-title {
  font-size: 1.35rem;
  margin-bottom: 0.5rem;
}

.module-description {
  font-size: 0.875rem;
  color: var(--color-muted);
  line-height: 1.5;
  margin-bottom: 1.5rem;
  flex-grow: 1;
}

.module-action {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-dark);
  border-top: 1px solid #ebe4de;
  padding-top: 0.75rem;
}
</style>
