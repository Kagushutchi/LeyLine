import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([]);

  const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const duration = toast.duration ?? 4000;
    const newToast: ToastItem = { ...toast, id, duration };

    toasts.value.push(newToast);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  };

  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  const success = (message: string, title = 'Operación Exitosa') => {
    return addToast({ type: 'success', title, message });
  };

  const error = (message: string, title = 'Error') => {
    return addToast({ type: 'error', title, message, duration: 5500 });
  };

  const info = (message: string, title = 'Información') => {
    return addToast({ type: 'info', title, message });
  };

  const warning = (message: string, title = 'Atención') => {
    return addToast({ type: 'warning', title, message });
  };

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };
});
