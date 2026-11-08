<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-monogram">CC</span>
        <h1 class="auth-title">Crear Cuenta</h1>
        <p class="auth-subtitle">Elige el tipo de perfil para tu membresía o bodega</p>
      </div>

      <!-- Selector de Tipo de Perfil (Tabs) -->
      <div class="profile-tabs">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: selectedRole === 'admin' }"
          @click="selectedRole = 'admin'"
        >
          🏛️ Dueño de Bodega (Admin)
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: selectedRole === 'subscriptor' }"
          @click="selectedRole = 'subscriptor'"
        >
          🍷 Cliente (Subscriptor)
        </button>
      </div>

      <!-- Formulario Administrador de Bodega -->
      <form v-if="selectedRole === 'admin'" @submit.prevent="handleRegisterAdmin" class="auth-form">
        <div class="form-group">
          <label for="admin-negocio" class="form-label">Nombre del Negocio / Bodega</label>
          <input
            id="admin-negocio"
            v-model="adminForm.nombreNegocio"
            type="text"
            class="form-input"
            placeholder="ej. Bodega Trapiche, Café Quínoa"
            required
            :disabled="authStore.loading"
          />
        </div>

        <div class="form-group">
          <label for="admin-username" class="form-label">Nombre de Usuario</label>
          <input
            id="admin-username"
            v-model="adminForm.username"
            type="text"
            class="form-input"
            placeholder="ej. trapiche_admin"
            required
            :disabled="authStore.loading"
          />
        </div>

        <div class="form-group">
          <label for="admin-email" class="form-label">Correo Electrónico</label>
          <input
            id="admin-email"
            v-model="adminForm.email"
            type="email"
            class="form-input"
            placeholder="contacto@bodega.com"
            required
            :disabled="authStore.loading"
          />
        </div>

        <div class="form-group">
          <label for="admin-password" class="form-label">Contraseña</label>
          <input
            id="admin-password"
            v-model="adminForm.password"
            type="password"
            class="form-input"
            placeholder="Mínimo 6 caracteres"
            required
            minlength="6"
            :disabled="authStore.loading"
          />
        </div>

        <div v-if="authStore.error" class="auth-error-box">
          {{ authStore.error }}
        </div>

        <button type="submit" class="btn btn-primary auth-submit-btn" :disabled="authStore.loading">
          <span v-if="authStore.loading">Registrando Bodega...</span>
          <span v-else>Registrar Bodega & Iniciar Administración</span>
        </button>
      </form>

      <!-- Formulario Subscriptor / Cliente -->
      <form v-else @submit.prevent="handleRegisterSubscriptor" class="auth-form">
        <div class="form-row">
          <div class="form-group">
            <label for="sub-nombre" class="form-label">Nombre</label>
            <input
              id="sub-nombre"
              v-model="subForm.nombre"
              type="text"
              class="form-input"
              placeholder="ej. Carlos"
              required
              :disabled="authStore.loading"
            />
          </div>

          <div class="form-group">
            <label for="sub-apellido" class="form-label">Apellido</label>
            <input
              id="sub-apellido"
              v-model="subForm.apellido"
              type="text"
              class="form-input"
              placeholder="ej. Gardel"
              required
              :disabled="authStore.loading"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="sub-username" class="form-label">Nombre de Usuario</label>
          <input
            id="sub-username"
            v-model="subForm.username"
            type="text"
            class="form-input"
            placeholder="ej. cgardel"
            required
            :disabled="authStore.loading"
          />
        </div>

        <div class="form-group">
          <label for="sub-email" class="form-label">Correo Electrónico</label>
          <input
            id="sub-email"
            v-model="subForm.email"
            type="email"
            class="form-input"
            placeholder="carlos@correo.com"
            required
            :disabled="authStore.loading"
          />
        </div>

        <div class="form-group">
          <label for="sub-password" class="form-label">Contraseña</label>
          <input
            id="sub-password"
            v-model="subForm.password"
            type="password"
            class="form-input"
            placeholder="Mínimo 6 caracteres"
            required
            minlength="6"
            :disabled="authStore.loading"
          />
        </div>

        <div v-if="authStore.error" class="auth-error-box">
          {{ authStore.error }}
        </div>

        <button type="submit" class="btn btn-primary auth-submit-btn" :disabled="authStore.loading">
          <span v-if="authStore.loading">Creando membresía...</span>
          <span v-else>Crear Cuenta de Subscriptor</span>
        </button>
      </form>

      <div class="auth-footer">
        <span>¿Ya tienes una cuenta?</span>
        <router-link to="/login" class="auth-link">Inicia sesión</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/common/store/auth.store';

const router = useRouter();
const authStore = useAuthStore();

const selectedRole = ref<'admin' | 'subscriptor'>('admin');

const adminForm = reactive({
  nombreNegocio: '',
  username: '',
  email: '',
  password: '',
});

const subForm = reactive({
  nombre: '',
  apellido: '',
  username: '',
  email: '',
  password: '',
});

const handleRegisterAdmin = async () => {
  try {
    await authStore.registerAdmin(adminForm);
    router.push('/');
  } catch {
    // Error manejado en store
  }
};

const handleRegisterSubscriptor = async () => {
  try {
    await authStore.registerSubscriptor(subForm);
    router.push('/catalogo');
  } catch {
    // Error manejado en store
  }
};
</script>

<style scoped>
.auth-container {
  min-height: calc(100vh - 120px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2.5rem 1.5rem;
  background-color: var(--color-light);
}

.auth-card {
  width: 100%;
  max-width: 520px;
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 20px rgba(2, 2, 1, 0.06);
  padding: 2.5rem;
}

.auth-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.auth-monogram {
  display: inline-block;
  font-family: var(--font-serif);
  font-size: 1.1rem;
  font-weight: 700;
  background-color: var(--color-dark);
  color: var(--color-light);
  padding: 0.35rem 0.75rem;
  margin-bottom: 0.75rem;
  letter-spacing: 0.08em;
}

.auth-title {
  font-family: var(--font-serif);
  font-size: 1.85rem;
  color: var(--color-dark);
  margin: 0 0 0.35rem 0;
  letter-spacing: 0.04em;
}

.auth-subtitle {
  font-size: 0.85rem;
  color: var(--color-accent);
  margin: 0;
}

.profile-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1.75rem;
  padding: 0.25rem;
  background-color: #f0ece9;
  border: 1px solid var(--color-border);
}

.tab-btn {
  padding: 0.65rem 0.5rem;
  font-size: 0.785rem;
  font-weight: 600;
  border: none;
  background: transparent;
  color: var(--color-accent);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
}

.tab-btn.active {
  background-color: var(--color-dark);
  color: var(--color-light);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-dark);
}

.form-input {
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--color-border);
  font-size: 0.875rem;
  background-color: #faf8f6;
  color: var(--color-dark);
  outline: none;
  transition: border-color var(--transition-fast);
}

.form-input:focus {
  border-color: var(--color-dark);
  background-color: #ffffff;
}

.auth-submit-btn {
  width: 100%;
  padding: 0.85rem;
  font-size: 0.95rem;
  margin-top: 0.5rem;
}

.auth-error-box {
  background-color: #fde8e8;
  color: #b91c1c;
  padding: 0.75rem;
  font-size: 0.825rem;
  border-left: 3px solid #b91c1c;
}

.auth-footer {
  margin-top: 1.75rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-accent);
  display: flex;
  justify-content: center;
  gap: 0.4rem;
}

.auth-link {
  color: var(--color-dark);
  font-weight: 600;
  text-decoration: underline;
}

.auth-link:hover {
  color: var(--color-accent);
}
</style>

