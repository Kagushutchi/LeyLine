<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <span class="auth-monogram">CC</span>
        <h1 class="auth-title">Iniciar Sesión</h1>
        <p class="auth-subtitle">Acceso exclusivo a la plataforma ClubCurator</p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label for="identifier" class="form-label">Usuario o Correo Electrónico</label>
          <input
            id="identifier"
            v-model="form.identifier"
            type="text"
            class="form-input"
            placeholder="admin / valentina / tu@email.com"
            required
            :disabled="authStore.loading"
          />
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Contraseña</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="form-input"
            placeholder="••••••••"
            required
            :disabled="authStore.loading"
          />
        </div>

        <div v-if="authStore.error" class="auth-error-box">
          {{ authStore.error }}
        </div>

        <button type="submit" class="btn btn-primary auth-submit-btn" :disabled="authStore.loading">
          <span v-if="authStore.loading">Verificando credenciales...</span>
          <span v-else>Ingresar a la Plataforma</span>
        </button>
      </form>

      <!-- Accesos Rápidos de Demostración -->
      <div class="demo-section">
        <span class="demo-title">Accesos Rápidos Demo:</span>
        <div class="demo-buttons">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            @click="fillDemo('admin')"
            :disabled="authStore.loading"
          >
            Admin Bodega (admin)
          </button>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            @click="fillDemo('subscriptor')"
            :disabled="authStore.loading"
          >
            Subscriptor (valentina)
          </button>
        </div>
      </div>

      <div class="auth-footer">
        <span>¿No tienes una cuenta?</span>
        <router-link to="/register" class="auth-link">Regístrate aquí</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/common/store/auth.store';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const form = reactive({
  identifier: '',
  password: '',
});

const fillDemo = (type: 'admin' | 'subscriptor') => {
  if (type === 'admin') {
    form.identifier = 'admin';
    form.password = 'password123';
  } else {
    form.identifier = 'valentina';
    form.password = 'password123';
  }
};

const handleSubmit = async () => {
  try {
    const res = await authStore.login(form);
    const redirectUrl = (route.query.redirect as string) || '';

    if (res.user.role === 'admin') {
      const destination = redirectUrl && !redirectUrl.startsWith('/login') && redirectUrl !== '/catalogo'
        ? redirectUrl
        : '/';
      router.push(destination);
    } else {
      const destination = redirectUrl && !redirectUrl.startsWith('/login') && redirectUrl !== '/'
        ? redirectUrl
        : '/catalogo';
      router.push(destination);
    }
  } catch {
    // El toast de error ya es manejado en el store
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
  max-width: 480px;
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 20px rgba(2, 2, 1, 0.06);
  padding: 2.5rem;
}

.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-monogram {
  display: inline-block;
  font-family: var(--font-serif);
  font-size: 1.1rem;
  font-weight: 700;
  background-color: var(--color-dark);
  color: var(--color-light);
  padding: 0.35rem 0.75rem;
  margin-bottom: 1rem;
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

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-dark);
}

.form-input {
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--color-border);
  font-size: 0.9rem;
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

.demo-section {
  margin-top: 1.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--color-border);
  text-align: center;
}

.demo-title {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-accent);
  margin-bottom: 0.65rem;
}

.demo-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
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

