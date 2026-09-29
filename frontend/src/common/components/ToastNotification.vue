<template>
  <div class="toast-container" aria-live="polite" aria-atomic="true">
    <transition-group name="toast">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="toast-card"
        :class="`toast-${toast.type}`"
      >
        <div class="toast-icon">
          <span v-if="toast.type === 'success'">✓</span>
          <span v-else-if="toast.type === 'error'">✕</span>
          <span v-else-if="toast.type === 'warning'">⚠</span>
          <span v-else>ℹ</span>
        </div>
        <div class="toast-content">
          <div v-if="toast.title" class="toast-title font-serif-title">{{ toast.title }}</div>
          <div class="toast-message">{{ toast.message }}</div>
        </div>
        <button
          type="button"
          class="toast-close"
          aria-label="Cerrar notificación"
          @click="toastStore.removeToast(toast.id)"
        >
          &times;
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useToastStore } from '../store/toast.store';

const toastStore = useToastStore();
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 380px;
  width: calc(100% - 3rem);
  pointer-events: none;
}

.toast-card {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.9rem 1.1rem;
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.12);
  color: var(--color-dark);
}

.toast-icon {
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.2;
  margin-top: 0.1rem;
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.2rem;
  color: var(--color-dark);
}

.toast-message {
  font-size: 0.825rem;
  line-height: 1.4;
  color: var(--color-dark);
}

.toast-close {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  line-height: 1;
  color: var(--color-accent);
  cursor: pointer;
  padding: 0;
  margin-left: 0.25rem;
  transition: color var(--transition-fast);
}

.toast-close:hover {
  color: var(--color-dark);
}

/* Toast Type Variants */
.toast-success {
  border-left: 4px solid var(--color-success);
  background-color: #f6fcf8;
}
.toast-success .toast-icon {
  color: var(--color-success);
}

.toast-error {
  border-left: 4px solid var(--color-danger);
  background-color: #fef2f2;
}
.toast-error .toast-icon {
  color: var(--color-danger);
}

.toast-warning {
  border-left: 4px solid var(--color-warning);
  background-color: #fffbeb;
}
.toast-warning .toast-icon {
  color: var(--color-warning);
}

.toast-info {
  border-left: 4px solid var(--color-accent);
  background-color: #f8fafc;
}
.toast-info .toast-icon {
  color: var(--color-accent);
}

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 180ms ease-out;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
