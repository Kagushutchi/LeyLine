<template>
  <div class="container">
    <div class="hero">
      <div class="hero-badge">ClubCurator SaaS Engine</div>
      <h1>Gestión Integral de Membresías y Curaduría</h1>
      <p class="hero-subtitle">
        SaaS para marcas de nicho de vinos, cafés de especialidad y cervezas artesanales.
        Automatiza cobros recurrentes, personalización organoléptica y sincronización de bodegas.
      </p>
    </div>

    <div class="grid-cards">
      <router-link to="/suscriptores" class="card module-card">
        <div class="card-icon">👥</div>
        <h3>Suscriptores (Clientes)</h3>
        <p>Administra perfiles, historial de envíos y preferencias de cata / sabor.</p>
        <span class="link-label">Ir al módulo &rarr;</span>
      </router-link>

      <router-link to="/suscripciones" class="card module-card">
        <div class="card-icon">📦</div>
        <h3>Suscripciones (Pedidos)</h3>
        <p>Control del estado de membresías recurrentes, facturación periódica y pausas.</p>
        <span class="link-label">Ir al módulo &rarr;</span>
      </router-link>

      <router-link to="/cajas-mensuales" class="card module-card">
        <div class="card-icon">🍷</div>
        <h3>Cajas Mensuales (Productos)</h3>
        <p>Catálogo de variedades del mes, stock disponible y combinaciones personalizadas.</p>
        <span class="link-label">Ir al módulo &rarr;</span>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// Dashboard Principal
</script>

<style scoped>
.hero {
  text-align: center;
  margin: 2rem 0 3rem 0;
}

.hero-badge {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  font-size: 0.8rem;
  border-radius: 9999px;
  margin-bottom: 1rem;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.hero h1 {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 1rem;
}

.hero-subtitle {
  max-width: 650px;
  margin: 0 auto;
  color: var(--text-secondary);
  font-size: 1.05rem;
}

.module-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  transition: all 0.2s ease;
}

.module-card:hover {
  transform: translateY(-3px);
  border-color: rgba(99, 102, 241, 0.5);
}

.card-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.module-card h3 {
  margin-bottom: 0.5rem;
  font-size: 1.2rem;
}

.module-card p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  flex-grow: 1;
  margin-bottom: 1.25rem;
}

.link-label {
  color: #818cf8;
  font-size: 0.85rem;
  font-weight: 600;
}
</style>
