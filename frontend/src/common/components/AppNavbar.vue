<template>
  <header class="navbar">
    <div class="navbar-container">
      <router-link to="/" class="brand">
        <span class="brand-monogram">CC</span>
        <div class="brand-text">
          <span class="brand-title">CLUBCURATOR</span>
          <span class="brand-subtitle">Curaduría de Nicho</span>
        </div>
      </router-link>

      <nav class="nav-links">
        <router-link to="/" class="nav-link" active-class="active">Dashboard</router-link>
        <router-link to="/suscriptores" class="nav-link" active-class="active">Suscriptores</router-link>
        <router-link to="/suscripciones" class="nav-link" active-class="active">Suscripciones</router-link>
        <router-link to="/cajas-mensuales" class="nav-link" active-class="active">Cajas Mensuales</router-link>
        <router-link to="/productos" class="nav-link" active-class="active">Productos</router-link>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
// Navbar de navegación con paleta de lujo
</script>

<style scoped>
.navbar {
  background-color: var(--color-dark);
  border-bottom: 1px solid rgba(194, 197, 203, 0.2);
  position: sticky;
  top: 0;
  z-index: 50;
}

.navbar-container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0.9rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  text-decoration: none;
}

.brand-monogram {
  font-family: var(--font-serif);
  background-color: var(--color-light);
  color: var(--color-dark);
  font-size: 0.95rem;
  font-weight: 700;
  padding: 0.25rem 0.55rem;
  border-radius: var(--radius-xs);
  letter-spacing: 0.05em;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-family: var(--font-serif);
  color: var(--color-light);
  font-size: 1.15rem;
  letter-spacing: 0.12em;
  font-weight: 700;
  line-height: 1.1;
}

.brand-subtitle {
  color: var(--color-accent);
  font-size: 0.65rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.nav-links {
  display: flex;
  gap: 0.5rem;
}

.nav-link {
  color: var(--color-light);
  opacity: 0.8;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.45rem 0.9rem;
  border-radius: var(--radius-xs);
  letter-spacing: 0.03em;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.nav-link:hover {
  opacity: 1;
  background-color: rgba(242, 232, 226, 0.08);
}

.nav-link.active {
  opacity: 1;
  color: var(--color-dark);
  background-color: var(--color-light);
  border-color: var(--color-light);
  font-weight: 600;
}

@media (max-width: 768px) {
  .navbar-container {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }
  .nav-links {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 0.25rem;
  }
}
</style>
