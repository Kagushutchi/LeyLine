<template>
  <header class="navbar">
    <div class="navbar-container">
      <router-link to="/" class="brand">
        <span class="brand-badge">SaaS</span>
        <span class="brand-title">ClubCurator</span>
      </router-link>

      <nav class="nav-links">
        <router-link to="/" class="nav-link" active-class="active">Dashboard</router-link>
        <router-link to="/suscriptores" class="nav-link" active-class="active">Suscriptores (Clientes)</router-link>
        <router-link to="/suscripciones" class="nav-link" active-class="active">Suscripciones (Pedidos)</router-link>
        <router-link to="/cajas-mensuales" class="nav-link" active-class="active">Cajas Mensuales (Productos)</router-link>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
// Componente de navegación principal
</script>

<style scoped>
.navbar {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 50;
}

.navbar-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.25rem;
}

.brand-badge {
  background: var(--primary);
  color: white;
  font-size: 0.65rem;
  padding: 0.15rem 0.45rem;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
}

.brand-title {
  background: linear-gradient(135deg, #fff, var(--text-secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-link {
  color: var(--text-secondary);
  font-size: 0.9rem;
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.05);
}

.nav-link.active {
  color: #ffffff;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
}
</style>
