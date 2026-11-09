import { defineStore } from 'pinia';
import { ref } from 'vue';
import { solicitudesService, type SolicitudDTO, type SolicitudPayload } from '../services/solicitudes.service';
import { blockForFailure, classifySubmissionFailure } from './solicitudes.logic';

interface Draft { key: string; payload: SolicitudPayload; requestId?: string; blocked?: 'conflict' | 'rejected' }
const prefix = 'cc_subscription_request:';

export const useSolicitudesStore = defineStore('solicitudes', () => {
  const items = ref<SolicitudDTO[]>([]);
  const draft = ref<Draft | null>(null);
  const userId = ref<string | null>(null);
  const loading = ref(false);
  const sending = ref(false);
  const error = ref<string | null>(null);
  const uncertain = ref(false);
  const ready = ref(false);
  const storageBlocked = ref(false);
  const submissionProblem = ref<string | null>(null);
  let generation = 0;

  function setUser(id: string | null) {
    if (id === userId.value) return;
    generation++;
    userId.value = id; items.value = []; draft.value = null; error.value = null;
    uncertain.value = false; ready.value = false;
    storageBlocked.value = false; sending.value = false; loading.value = false;
    submissionProblem.value = null;
    if (!id) return;
    try {
      const raw = localStorage.getItem(prefix + id);
      if (raw) {
        const saved: Draft = JSON.parse(raw);
        if (!saved.key || !saved.payload?.cajaMensualId || !Number.isSafeInteger(saved.payload.precioConfirmadoCentavos)) throw new Error('invalid draft');
        draft.value = saved;
        uncertain.value = !saved.requestId && !saved.blocked;
        if (saved.blocked) submissionProblem.value = 'El intento anterior requiere revisión. Consultá tus solicitudes o contactá a soporte antes de intentar otro.';
      }
    } catch {
      // Do not silently discard an unrecoverable draft and risk a duplicate.
      error.value = 'No pudimos recuperar la solicitud anterior. Contactá a soporte antes de intentar otra.';
      storageBlocked.value = true;
    }
  }

  async function refresh() {
    if (!userId.value || loading.value) return;
    const owner = userId.value; const version = generation;
    loading.value = true;
    try {
      const list = await solicitudesService.list();
      if (version !== generation || owner !== userId.value) return;
      items.value = list; ready.value = !storageBlocked.value;
      if (!storageBlocked.value) error.value = null;
      const current = draft.value;
      if (current?.requestId && list.some(item => item.id === current.requestId && isTerminal(item.estado))) {
        localStorage.removeItem(prefix + owner); draft.value = null; uncertain.value = false;
      }
    } catch {
      if (version === generation) { ready.value = false; error.value = 'No pudimos consultar tus solicitudes. Reintentá antes de enviar otra.'; }
    } finally {
      if (version === generation) loading.value = false;
    }
  }

  async function submit(payload?: SolicitudPayload): Promise<SolicitudDTO | null> {
    const owner = userId.value; const version = generation;
    if (!owner || sending.value || !ready.value || error.value) return null;
    if (!draft.value) {
      if (!payload || !Number.isSafeInteger(payload.precioConfirmadoCentavos) || payload.precioConfirmadoCentavos < 1) return null;
      const created: Draft = { key: crypto.randomUUID(), payload };
      try { localStorage.setItem(prefix + owner, JSON.stringify(created)); }
      catch { error.value = 'No pudimos guardar el intento de forma segura. Revisá el almacenamiento del navegador.'; return null; }
      draft.value = created;
    }
    if (draft.value.requestId || draft.value.blocked) return null;
    const current = draft.value;
    sending.value = true; uncertain.value = false; submissionProblem.value = null;
    try {
      const result = await solicitudesService.create(current.payload, current.key);
      if (version !== generation || owner !== userId.value) return null;
      if (!result?.id || result.cajaMensualId !== current.payload.cajaMensualId) throw new Error('Respuesta inválida');
      draft.value = { ...current, requestId: result.id };
      localStorage.setItem(prefix + owner, JSON.stringify(draft.value));
      items.value = [result, ...items.value.filter(item => item.id !== result.id)];
      return result;
    } catch (error) {
      if (version === generation) {
        const failure = classifySubmissionFailure(error);
        if (failure === 'price-changed') {
          localStorage.removeItem(prefix + owner);
          draft.value = null;
          submissionProblem.value = 'El precio cambió. Actualizá el catálogo y confirmá nuevamente las condiciones.';
        } else if (failure === 'already-subscribed' || failure === 'in-progress') {
          // Definitive: nothing was created, so the attempt can be discarded safely.
          localStorage.removeItem(prefix + owner);
          draft.value = null;
          submissionProblem.value = failure === 'already-subscribed'
            ? 'Ya tenés una suscripción para esta caja.'
            : 'Ya hay un pedido en curso para esta caja. Revisá tus solicitudes.';
          void refresh();
        } else if (failure === 'conflict') {
          draft.value = { ...current, blocked: blockForFailure(failure) };
          try { localStorage.setItem(prefix + owner, JSON.stringify(draft.value)); } catch { storageBlocked.value = true; ready.value = false; }
          submissionProblem.value = 'Hay un conflicto con la clave del pedido. Consultá tus solicitudes o contactá a soporte; no envíes otra.';
        } else if (failure === 'rejected') {
          draft.value = { ...current, blocked: blockForFailure(failure) };
          try { localStorage.setItem(prefix + owner, JSON.stringify(draft.value)); } catch { storageBlocked.value = true; ready.value = false; }
          submissionProblem.value = 'No se pudo aceptar el pedido. Consultá tus solicitudes o contactá a soporte antes de intentar otro.';
        } else {
          uncertain.value = true;
        }
      }
      return null;
    } finally {
      if (version === generation) sending.value = false;
    }
  }

  /** Waits (long-poll) for one request to resolve; returns the latest known state or null. */
  async function wait(id: string, waitMs = 4000): Promise<SolicitudDTO | null> {
    const owner = userId.value; const version = generation;
    if (!owner) return null;
    try {
      const latest = await solicitudesService.wait(id, waitMs);
      if (version !== generation || owner !== userId.value || latest?.id !== id) return null;
      items.value = items.value.map(item => item.id === id ? latest : item);
      return latest;
    } catch { return null; }
  }

  return { wait, items, draft, loading, sending, error, uncertain, ready, submissionProblem, setUser, refresh, submit };
});

export function isTerminal(state: SolicitudDTO['estado']): boolean {
  return state === 'completado' || state === 'rechazado' || state === 'fallido';
}
