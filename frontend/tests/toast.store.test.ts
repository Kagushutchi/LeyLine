import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useToastStore } from '../src/common/store/toast.store';

describe('toast store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('agrega y elimina toasts manualmente', () => {
    const store = useToastStore();

    const id = store.success('Guardado');

    expect(store.toasts).toHaveLength(1);
    expect(store.toasts[0].type).toBe('success');

    store.removeToast(id);

    expect(store.toasts).toHaveLength(0);
  });

  it('auto-elimina el toast cuando vence la duración', () => {
    const store = useToastStore();

    store.addToast({ type: 'info', message: 'Hola', duration: 1000 });
    expect(store.toasts).toHaveLength(1);

    vi.advanceTimersByTime(1000);

    expect(store.toasts).toHaveLength(0);
  });
});
