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

      <!-- Navegación Admin -->
      <nav v-if="authStore.isAdmin" class="nav-links">
        <router-link to="/" class="nav-link" active-class="active">Dashboard</router-link>
        <router-link to="/suscriptores" class="nav-link" active-class="active">Suscriptores</router-link>
        <router-link to="/suscripciones" class="nav-link" active-class="active">Suscripciones</router-link>
        <router-link to="/cajas-mensuales" class="nav-link" active-class="active">Cajas Mensuales</router-link>
        <router-link to="/productos" class="nav-link" active-class="active">Productos</router-link>
      </nav>

      <!-- Navegación Subscriptor -->
      <nav v-else-if="authStore.isSubscriptor" class="nav-links">
        <router-link to="/catalogo" class="nav-link" active-class="active">Catálogo</router-link>
      </nav>

      <!-- Área de usuario / acciones -->
      <div v-if="authStore.isAuthenticated" class="nav-user">
        <div class="user-info">
          <span class="user-name">{{ authStore.displayName }}</span>
          <span class="user-badge" :class="authStore.isAdmin ? 'badge-admin' : 'badge-subscriptor'">
            {{ authStore.isAdmin ? 'Admin' : 'Subscriptor' }}
          </span>
          <span v-if="authStore.isAdmin && authStore.tenantName" class="tenant-name">
            {{ authStore.tenantName }}
          </span>
        </div>
        <button class="btn-logout" :disabled="authStore.loading" @click="handleLogout">
          Salir
        </button>
      </div>

      <!-- Si no está autenticado (páginas guest) -->
      <div v-if="!authStore.isAuthenticated" class="nav-guest">
        <router-link to="/login" class="nav-link">Ingresar</router-link>
        <router-link to="/register" class="nav-link">Registrarse</router-link>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/common/store/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = async () => {
  await authStore.logout();
  router.push('/login');
};
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
  gap: 1rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  text-decoration: none;
  flex-shrink: 0;
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
  flex: 1;
  justify-content: center;
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
  text-decoration: none;
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

/* Área de usuario */
.nav-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-name {
  color: var(--color-light);
  font-size: 0.82rem;
  font-weight: 500;
  opacity: 0.9;
}

.user-badge {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.badge-admin {
  background-color: var(--color-accent);
  color: var(--color-dark);
}

.badge-subscriptor {
  background-color: rgba(194, 197, 203, 0.25);
  color: var(--color-light);
  border: 1px solid rgba(194, 197, 203, 0.4);
}

.tenant-name {
  font-size: 0.72rem;
  color: var(--color-accent);
  opacity: 0.75;
  font-style: italic;
}

.btn-logout {
  background: transparent;
  border: 1px solid rgba(194, 197, 203, 0.4);
  color: var(--color-light);
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  padding: 0.35rem 0.8rem;
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
  opacity: 0.75;
}

.btn-logout:hover {
  opacity: 1;
  border-color: var(--color-light);
  background-color: rgba(242, 232, 226, 0.08);
}

.btn-logout:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Guest links */
.nav-guest {
  display: flex;
  gap: 0.5rem;
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
    justify-content: flex-start;
  }
  .nav-user {
    width: 100%;
    justify-content: space-between;
  }
  .user-info {
    flex-wrap: wrap;
  }
  .tenant-name {
    display: none;
  }
}
</style>
