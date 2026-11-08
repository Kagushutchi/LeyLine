<template>
  <div class="app-layout">
    <AppNavbar v-if="showNavbar" />
    <main class="main-content">
      <router-view />
    </main>
    <ToastNotification />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AppNavbar from '@/common/components/AppNavbar.vue';
import ToastNotification from '@/common/components/ToastNotification.vue';
import { useAuthStore } from '@/common/store/auth.store';

const authStore = useAuthStore();
const route = useRoute();

// Hidratar sesión desde localStorage al arrancar la app
onMounted(() => {
  authStore.initAuth();
});

// Ocultar el navbar en rutas de login/register (guest routes)
const guestRoutes = ['/login', '/register'];
const showNavbar = computed(() => !guestRoutes.includes(route.path));
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
}
</style>
