<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="cancel">
    <div class="modal-content confirm-modal-box">
      <div class="modal-header">
        <h3 class="modal-title font-serif-title">{{ title }}</h3>
        <button type="button" class="modal-close" @click="cancel">&times;</button>
      </div>
      <div class="modal-body">
        <p class="confirm-message">{{ message }}</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="cancel">
          Cancelar
        </button>
        <button type="button" :class="isDanger ? 'btn btn-danger' : 'btn btn-primary'" :disabled="loading" @click="confirm">
          {{ loading ? 'Procesando...' : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    isOpen: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    isDanger?: boolean;
    loading?: boolean;
  }>(),
  {
    title: 'Confirmar Acción',
    confirmLabel: 'Confirmar',
    isDanger: true,
    loading: false,
  }
);

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const confirm = () => emit('confirm');
const cancel = () => emit('cancel');
</script>

<style scoped>
.confirm-modal-box {
  max-width: 440px;
}

.confirm-message {
  color: var(--color-dark);
  font-size: 0.95rem;
  line-height: 1.5;
}
</style>
