<template>
  <div class="app-layout">
    <AppNavbar />
    <main class="main-content">
      <router-view />
    </main>
    <ToastNotification />
  </div>
</template>

<script setup lang="ts">
import AppNavbar from '@/common/components/AppNavbar.vue';
import ToastNotification from '@/common/components/ToastNotification.vue';
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
