<template>
  <div class="container">
    <div class="view-header">
      <div>
        <h1 class="view-title">Mi Catálogo y Membresías</h1>
        <p class="view-subtitle">Explorar las cajas mensuales disponibles en tu club de membresía y gestionar tus suscripciones.</p>
      </div>
    </div>

    <!-- Sección: Mis Suscripciones Personales -->
    <div class="my-subscriptions-section">
      <div class="section-header">
        <h2 class="section-title">Mis Membresías Activas</h2>
        <span class="subscriptions-count">{{ misSuscripciones.length }} suscripción(es)</span>
      </div>

      <div v-if="loadingSuscripciones" class="state-box">
        <p class="state-desc">Consultando tus suscripciones...</p>
      </div>

      <div v-else-if="errorSuscripciones" class="state-box" role="alert">
        <p>{{ errorSuscripciones }}</p>
        <button class="btn btn-secondary" @click="fetchMisSuscripciones">Reintentar</button>
      </div>

      <div v-else-if="misSuscripciones.length === 0" class="empty-subs-box">
        <p class="empty-subs-text">Aún no tienes suscripciones activas vinculadas a tu cuenta.</p>
        <p class="empty-subs-hint">Elige una de las cajas exclusivas del catálogo a continuación para comenzar tu experiencia.</p>
      </div>

      <div v-else class="subs-grid">
        <div v-for="sub in misSuscripciones" :key="sub.id" class="sub-card">
          <div class="sub-header">
            <span class="badge" :class="sub.estado === 'activa' ? 'badge-success' : 'badge-warning'">
              {{ sub.pausadaPorPago ? 'PAUSADA POR PAGO' : sub.estado.toUpperCase() }}
            </span>
            <span class="sub-cat">{{ formatCategoria(sub.categoria) }}</span>
          </div>
          <h3 class="sub-caja-title">{{ sub.cajaMensual?.nombre || 'Caja de Membresía' }}</h3>
          <div class="sub-price">
            ${{ Number(sub.montoMensual).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }} / mes
          </div>
          <div class="sub-meta">
            <span v-if="sub.proximoCobro" class="meta-item">
              Próximo cobro: {{ formatDay(sub.proximoCobro) }}
            </span>
          </div>
          <p v-if="sub.pausadaPorPago" class="sub-warning" role="alert">
            No pudimos cobrar tu último pago. Actualizá tu medio de pago y la membresía se reactiva sola al cobrarse.
          </p>
          <div class="sub-actions">
            <button
              v-if="sub.estado === 'activa'"
              class="btn btn-secondary btn-sm"
              :disabled="actionLoading === sub.id"
              @click="handlePause(sub.id)"
            >
              Pausar
            </button>
            <button
              v-if="sub.estado === 'pausada' && !sub.pausadaPorPago"
              class="btn btn-primary btn-sm"
              :disabled="actionLoading === sub.id"
              @click="handleResume(sub.id)"
            >
              Reanudar
            </button>
            <button
              v-if="sub.paymentProvider && sub.estado !== 'cancelada'"
              :class="sub.pausadaPorPago ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'"
              :disabled="actionLoading === sub.id"
              @click="handleBillingPortal(sub.id)"
            >
              {{ sub.pausadaPorPago ? 'Actualizar medio de pago' : 'Gestionar pago' }}
            </button>
            <button
              v-if="sub.estado !== 'cancelada'"
              class="btn btn-outline-danger btn-sm"
              :disabled="actionLoading === sub.id"
              @click="askCancel(sub.id)"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <section v-if="requestsEnabled" class="my-subscriptions-section" aria-labelledby="request-title">
      <h2 id="request-title" class="section-title">Mis solicitudes</h2>
      <p v-if="requests.loading">Consultando solicitudes...</p>
      <p v-if="requests.error" role="alert">{{ requests.error }}</p>
      <p v-if="requests.submissionProblem" role="alert">{{ requests.submissionProblem }}</p>
      <button v-if="requests.error" class="btn btn-secondary btn-sm" @click="requests.refresh()">Reintentar consulta</button>
      <div aria-live="polite">
        <p v-if="requests.uncertain">No pudimos confirmar si se recibió tu solicitud. Reintentá el mismo envío para comprobarlo.</p>
        <button v-if="requests.uncertain" class="btn btn-secondary btn-sm" :disabled="requests.sending || !requests.ready" @click="retryRequest">
          {{ requests.sending ? 'Enviando...' : 'Reintentar el mismo envío' }}
        </button>
        <p v-for="request in requests.items" :key="request.id">
          Solicitud {{ request.id }}: {{ requestStatus(request.estado) }}
          <span v-if="request.errorPublico"> — {{ request.errorPublico }}</span>
          <span v-if="request.estado === 'esperando_pago' && request.cobro"> — Total a pagar: {{ formatCharge(request.cobro) }}</span>
          <template v-if="request.estado === 'esperando_pago'">
            <a
              v-if="safeCheckoutUrl(request.checkoutUrl)"
              class="btn btn-primary btn-sm"
              :href="safeCheckoutUrl(request.checkoutUrl) ?? undefined"
            >Completar el pago</a>
            <button class="btn btn-secondary btn-sm" :disabled="discarding === request.id" @click="handleDiscard(request.id)">
              {{ discarding === request.id ? 'Descartando...' : 'Descartar' }}
            </button>
          </template>
        </p>
      </div>
      <button class="btn btn-secondary btn-sm" :disabled="requests.loading" @click="refreshRequests">Actualizar estado</button>
    </section>

    <!-- Sección: Sommelier IA (Recomendación Personalizada para el Cliente) -->
    <div class="ia-sommelier-section">
      <div class="ia-banner">
        <div class="ia-banner-content">
          <div class="ia-header-badge">
            SOMMELIER INTELIGENTE (GOOGLE GEMINI)
          </div>
          <h2 class="ia-title">¿Buscás una recomendación a tu medida?</h2>
          <p class="ia-subtitle">
            Nuestro sommelier de Inteligencia Artificial analiza tus notas de cata preferidas,
            intensidad y restricciones para sugerirte la caja ideal de nuestro catálogo exclusivo.
          </p>
        </div>
        <div class="ia-banner-action">
          <button
            class="btn btn-ia"
            :disabled="loadingRecommendation"
            @click="pedirRecomendacionIA"
          >
            <span v-if="loadingRecommendation">Analizando tus notas de cata...</span>
            <span v-else>Descubrir mi caja ideal</span>
          </button>
        </div>
      </div>

      <!-- Tarjeta de resultado de la recomendación -->
      <div v-if="recommendationResult" class="ia-result-card">
        <div class="ia-result-header">
          <div class="ia-match-badge">
            {{ recommendationResult.puntajeMatchPorcentaje }}% de Coincidencia con tus gustos
          </div>
          <span class="ia-model-badge">Modelo: {{ recommendationResult.modeloIA }}</span>
        </div>

        <div class="ia-result-body">
          <div class="ia-caja-info">
            <div class="badge badge-accent mb-2">{{ formatCategoria(recommendationResult.cajaRecomendada.categoria) }}</div>
            <h3 class="ia-caja-title">{{ recommendationResult.cajaRecomendada.nombre }}</h3>
            <p v-if="recommendationResult.cajaRecomendada.descripcion" class="ia-caja-desc">
              {{ recommendationResult.cajaRecomendada.descripcion }}
            </p>
            <div class="ia-caja-price">
              ${{ Number(recommendationResult.cajaRecomendada.precioBase).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }} / mes
            </div>

            <div v-if="recommendationResult.cajaRecomendada.composiciones?.length" class="ia-comp-list">
              <span class="comp-label">Selección incluida:</span>
              <div
                v-for="comp in recommendationResult.cajaRecomendada.composiciones"
                :key="comp.id"
                class="comp-item"
              >
                {{ comp.producto?.nombre || 'Producto' }} (x{{ comp.cantidad }})
              </div>
            </div>
          </div>

          <div class="ia-sommelier-note">
            <div class="note-label">Veredicto de Cata del Sommelier IA:</div>
            <p class="note-text">{{ recommendationResult.explicacion }}</p>

            <div class="note-actions">
              <button
                v-if="isSubscribedTo(recommendationResult.cajaRecomendada.id)"
                class="btn btn-secondary btn-sm"
                disabled
              >
                ✓ Ya estás suscripto a esta caja
              </button>
              <button
                v-else
                class="btn btn-primary"
                :disabled="actionLoading === recommendationResult.cajaRecomendada.id"
                @click="handleSubscribe(recommendationResult.cajaRecomendada)"
              >
                Suscribirme a la caja recomendada
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="recommendationError" class="ia-error-alert" role="alert">
        <span>{{ recommendationError }}</span>
      </div>
    </div>

    <!-- Divisor -->
    <div class="catalog-divider">
      <h2 class="section-title">Catálogo de Cajas Exclusivas</h2>
    </div>

    <!-- Catálogo de Cajas Disponibles -->
    <div v-if="store.loading" class="state-box">
      <h3 class="state-title">Cargando catálogo</h3>
      <p class="state-desc">Recuperando cajas disponibles...</p>
    </div>

    <div v-else-if="store.error && store.cajas.length === 0" class="state-box">
      <h3 class="state-title">Error al consultar datos</h3>
      <p class="state-desc">{{ store.error }}</p>
      <button class="btn btn-secondary" @click="store.fetchCajas">Reintentar</button>
    </div>

    <div v-else-if="store.cajas.length === 0" class="state-box">
      <h3 class="state-title">No hay cajas disponibles</h3>
      <p class="state-desc">Pronto habrá nuevas selecciones para tu membresía.</p>
    </div>

    <div v-else class="cajas-grid">
      <div v-for="caja in store.cajas" :key="caja.id" class="caja-card">
        <div class="caja-header">
          <span class="badge badge-accent">{{ formatCategoria(caja.categoria) }}</span>
          <span class="periodo-tag">{{ caja.mes }}/{{ caja.anio }}</span>
        </div>
        <h2 class="caja-nombre">{{ caja.nombre }}</h2>
        <p v-if="caja.descripcion" class="caja-desc">{{ caja.descripcion }}</p>
        <div class="caja-price">
          ${{ Number(caja.precioBase).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }} / mes
        </div>
        <div v-if="caja.composiciones?.length" class="composiciones-list">
          <span class="comp-label">Incluye:</span>
          <div
            v-for="comp in caja.composiciones.slice(0, 3)"
            :key="comp.id"
            class="comp-item"
          >
            {{ comp.producto?.nombre }}
          </div>
        </div>
        <div class="caja-footer">
          <span class="disponible-badge" :class="caja.disponible ? 'badge-success' : 'badge-warning'">
            {{ caja.disponible ? 'Disponible' : 'Agotada' }}
          </span>

          <button
            v-if="isSubscribedTo(caja.id)"
            class="btn btn-secondary btn-sm"
            disabled
          >
            ✓ Ya Suscripto
          </button>
          <button
            v-else-if="caja.disponible"
            class="btn btn-primary btn-sm"
            :disabled="actionLoading === caja.id || !!errorSuscripciones || (requestsEnabled && (!requests.ready || !!requests.draft || hasPendingRequest(caja.id)))"
            @click="handleSubscribe(caja)"
          >
            <span v-if="actionLoading === caja.id">Procesando...</span>
            <span v-else>Suscribirme</span>
          </button>
        </div>
      </div>
    </div>
    <dialog ref="confirmDialog" class="confirm-dialog" aria-labelledby="confirm-title" @close="onDialogClose">
      <h2 id="confirm-title">Confirmar solicitud</h2>
      <p>
        Solicitar la caja <strong>{{ selectedCaja?.nombre }}</strong> por
        <strong>${{ selectedCaja ? Number(selectedCaja.precioBase).toLocaleString('es-AR', { minimumFractionDigits: 2 }) : '' }} / mes</strong>.
      </p>
      <p>La solicitud se procesará después de enviarla. Si requiere pago, te llevamos a la página de pago; la membresía se activa cuando se confirma.</p>
      <div class="dialog-actions">
        <button class="btn btn-secondary" autofocus @click="confirmDialog?.close()">Volver</button>
        <button class="btn btn-primary" :disabled="requests.sending" @click="confirmRequest">Confirmar solicitud</button>
      </div>
    </dialog>
    <ConfirmModal
      :is-open="cancelTarget !== null"
      title="Cancelar membresía"
      message="¿Seguro que querés cancelar esta membresía? Se deja de cobrar y no se puede deshacer."
      confirm-label="Sí, cancelar membresía"
      :loading="cancelTarget !== null && actionLoading === cancelTarget"
      @confirm="confirmCancel"
      @cancel="cancelTarget = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiClient } from '@/common/api/http-client';
import { useAuthStore } from '@/common/store/auth.store';
import { useSolicitudesStore, isTerminal } from '@/modules/suscripciones/store/solicitudes.store';
import ConfirmModal from '@/common/components/ConfirmModal.vue';
import { safeCheckoutUrl, hasInFlightRequest, pollDelayForAge, formatDay, formatCharge } from '@/modules/suscripciones/store/solicitudes.logic';
import type { EstadoSolicitud } from '@/modules/suscripciones/services/solicitudes.service';
import type { CajaMensualDTO, RecommendationResultDTO } from '@/modules/cajas-mensuales/services/cajas-mensuales.service';
import { cajasMensualesService } from '@/modules/cajas-mensuales/services/cajas-mensuales.service';
import { useCajasMensualesStore } from '@/modules/cajas-mensuales/store/cajas-mensuales.store';
import { suscripcionesService, SuscripcionDTO } from '@/modules/suscripciones/services/suscripciones.service';
import { useToastStore } from '@/common/store/toast.store';

const store = useCajasMensualesStore();
const toast = useToastStore();
const auth = useAuthStore();
const requests = useSolicitudesStore();
const route = useRoute();
const router = useRouter();
const requestsEnabled = import.meta.env.VITE_SUBSCRIPTION_REQUESTS_ENABLED === 'true';
const confirmDialog = ref<HTMLDialogElement | null>(null);
const selectedCaja = ref<CajaMensualDTO | null>(null);
let dialogTrigger: HTMLElement | null = null;
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let pendingSince: number | null = null;
let previousCompleted = new Set<string>();
let disposed = false;
// Tras volver del checkout (?pago=exito) se consulta seguido por un rato para detectar la activación.
let awaitingPaymentUntil = 0;
let membershipGeneration = 0;

const misSuscripciones = ref<SuscripcionDTO[]>([]);
const loadingSuscripciones = ref<boolean>(false);
const errorSuscripciones = ref<string | null>(null);
const actionLoading = ref<string | null>(null);
const discarding = ref<string | null>(null);
const cancelTarget = ref<string | null>(null);

// Estado de la recomendación IA
const recommendationResult = ref<RecommendationResultDTO | null>(null);
const loadingRecommendation = ref<boolean>(false);
const recommendationError = ref<string | null>(null);

const pedirRecomendacionIA = async () => {
  let suscriptorId = auth.user?.suscriptorId;

  // Si no está en el store (por ejemplo sesión anterior en localStorage), consultar /auth/me
  if (!suscriptorId) {
    try {
      const meRes: any = await apiClient.get('/auth/me');
      if (meRes.data?.suscriptorId) {
        suscriptorId = meRes.data.suscriptorId;
        if (auth.user) {
          auth.user.suscriptorId = suscriptorId;
          localStorage.setItem('cc_user', JSON.stringify(auth.user));
        }
      }
    } catch {
      // Ignorar error si falla consulta
    }
  }

  if (!suscriptorId) {
    toast.error('Tu cuenta de usuario no tiene un perfil de suscriptor vinculado para evaluar notas de cata.', 'Perfil no vinculado');
    return;
  }

  loadingRecommendation.value = true;
  recommendationError.value = null;

  try {
    const res = await cajasMensualesService.recommend(suscriptorId);
    if (res.data) {
      recommendationResult.value = res.data;
      toast.success('¡El Sommelier IA seleccionó la mejor opción según tu perfil!', 'Recomendación lista');
    }
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || 'No se pudo obtener la recomendación de IA.';
    recommendationError.value = msg;
    toast.error(msg, 'Error Sommelier IA');
  } finally {
    loadingRecommendation.value = false;
  }
};

const fetchMisSuscripciones = async () => {
  const generation = ++membershipGeneration;
  const owner = auth.user?.id;
  loadingSuscripciones.value = true;
  errorSuscripciones.value = null;
  try {
    const res: any = await suscripcionesService.getAll();
    if (generation !== membershipGeneration || owner !== auth.user?.id) return;
    if (!Array.isArray(res.data)) throw new Error('Respuesta inválida');
    misSuscripciones.value = Array.isArray(res.data) ? res.data : [];
  } catch {
    if (generation === membershipGeneration && owner === auth.user?.id) errorSuscripciones.value = 'No pudimos consultar tus membresías. Reintentá antes de solicitar otra.';
  } finally {
    if (generation === membershipGeneration) loadingSuscripciones.value = false;
  }
};

// Al volver del checkout el proveedor redirige a /catalogo?pago=exito|cancelado.
const handlePaymentReturn = () => {
  const result = route.query.pago;
  if (result === 'exito') {
    awaitingPaymentUntil = Date.now() + 90000;
    toast.info('Recibimos tu pago. Estamos activando tu membresía; puede tardar unos segundos.', 'Pago recibido');
  } else if (result === 'cancelado') {
    toast.info('El pago no se completó. Podés retomarlo desde "Mis solicitudes".', 'Pago cancelado');
  }
  if (result) void router.replace({ query: { ...route.query, pago: undefined } });
};

onMounted(async () => {
  handlePaymentReturn();
  await Promise.all([
    store.fetchCajas(),
    fetchMisSuscripciones(),
  ]);
  if (disposed) return;
  if (requestsEnabled) {
    requests.setUser(auth.user?.id ?? null);
    await refreshRequests();
    if (disposed) return;
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
});

onUnmounted(() => {
  disposed = true;
  membershipGeneration++;
  if (pollTimer) clearTimeout(pollTimer);
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
watch(() => auth.user?.id, async (id) => {
  membershipGeneration++;
  misSuscripciones.value = [];
  errorSuscripciones.value = null;
  if (id) void fetchMisSuscripciones();
  if (!requestsEnabled) return;
  requests.setUser(id ?? null); previousCompleted = new Set();
  if (id) await refreshRequests();
});
const onVisibilityChange = () => { if (!document.hidden) void refreshRequests(); };
// Polling adaptivo: rápido mientras el servidor resuelve un pedido (suele tardar ~1 s) y NINGUNO cuando no hay nada en curso.
// Un pedido en `esperando_pago` espera al suscriptor, no al servidor: no se consulta en bucle; se actualiza al volver a la
// pestaña (visibilitychange) o con "Actualizar estado". Pausado mientras la pestaña está oculta.
const nextPollDelay = (): number | null => {
  const now = Date.now();
  if (!hasInFlightRequest(requests.items, now, awaitingPaymentUntil)) { pendingSince = null; return null; }
  pendingSince ??= now;
  return pollDelayForAge(now - pendingSince);
};
const schedulePoll = () => {
  if (disposed || !requestsEnabled) return;
  if (pollTimer) clearTimeout(pollTimer);
  const delay = nextPollDelay();
  if (delay === null) return;
  pollTimer = setTimeout(() => { if (document.hidden) schedulePoll(); else void refreshRequests(); }, delay);
};
// Long-poll the new request: the server answers as soon as the worker finishes (~100 ms).
const followRequest = async (id: string) => {
  for (let attempt = 0; attempt < 3 && !disposed; attempt++) {
    const latest = await requests.wait(id);
    // El worker ya creó el checkout: llevamos al suscriptor a la página de pago del proveedor.
    const checkoutUrl = latest?.estado === 'esperando_pago' ? safeCheckoutUrl(latest.checkoutUrl) : null;
    if (checkoutUrl && !disposed) {
      toast.info('Te llevamos a la página de pago.', 'Pago');
      window.location.assign(checkoutUrl);
      return;
    }
    if (!latest || isTerminal(latest.estado)) break;
  }
  if (!disposed) await refreshRequests();
};
const refreshRequests = async () => {
  await requests.refresh();
  const completed = requests.items.filter(item => item.estado === 'completado');
  if (completed.some(item => !previousCompleted.has(item.id))) await fetchMisSuscripciones();
  previousCompleted = new Set(completed.map(item => item.id));
  schedulePoll();
};
const hasPendingRequest = (cajaId: string) => requests.items.some(item => item.cajaMensualId === cajaId && !isTerminal(item.estado));
const requestStatus = (state: EstadoSolicitud) => ({
  pendiente: 'Recibida; pendiente de procesamiento', procesando: 'En procesamiento',
  esperando_pago: 'Esperando el pago', expirado: 'Expirada; podés solicitarla de nuevo',
  completado: 'Completada', rechazado: 'Rechazada', fallido: 'No pudo completarse; contactá a soporte',
}[state] || 'Estado desconocido; actualizá la consulta');
const onDialogClose = () => { selectedCaja.value = null; dialogTrigger?.focus(); };
const confirmRequest = async () => {
  const caja = selectedCaja.value;
  if (!caja) return;
  const result = await requests.submit({ cajaMensualId: caja.id, precioConfirmadoCentavos: Math.round(Number(caja.precioBase) * 100) });
  confirmDialog.value?.close();
  if (result) {
    toast.info('Solicitud recibida; estamos procesándola.', 'Solicitud recibida');
    pendingSince = null; schedulePoll(); // fallback polling
    void followRequest(result.id);
  }
};
const retryRequest = async () => {
  const result = await requests.submit();
  if (result) {
    toast.info('Solicitud recibida; estamos procesándola.', 'Solicitud recibida');
    pendingSince = null; schedulePoll(); // fallback polling
    void followRequest(result.id);
  }
};

const isSubscribedTo = (cajaId: string) => {
  return misSuscripciones.value.some(
    (s) => s.cajaMensualId === cajaId && s.estado !== 'cancelada'
  );
};

const handleSubscribe = async (caja: CajaMensualDTO) => {
  if (requestsEnabled) {
    dialogTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    selectedCaja.value = { ...caja };
    confirmDialog.value?.showModal();
    return;
  }
  actionLoading.value = caja.id;
  try {
    await suscripcionesService.create({
      cajaMensualId: caja.id,
      montoMensual: caja.precioBase,
      categoria: caja.categoria,
    });
    toast.success(`¡Te has suscrito con éxito a "${caja.nombre}"!`, 'Membresía activada');
    await fetchMisSuscripciones();
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || 'Error al procesar la suscripción';
    toast.error(msg);
  } finally {
    actionLoading.value = null;
  }
};

const handlePause = async (id: string) => {
  actionLoading.value = id;
  try {
    await suscripcionesService.pause(id);
    toast.info('Suscripción pausada correctamente', 'Pausa confirmada');
    await fetchMisSuscripciones();
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Error al pausar la suscripción');
  } finally {
    actionLoading.value = null;
  }
};

const handleResume = async (id: string) => {
  actionLoading.value = id;
  try {
    await suscripcionesService.resume(id);
    toast.info('Suscripción reanudada correctamente', 'Membresía activa');
    await fetchMisSuscripciones();
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Error al reanudar la suscripción');
  } finally {
    actionLoading.value = null;
  }
};

const handleDiscard = async (id: string) => {
  discarding.value = id;
  try {
    const ok = await requests.discard(id);
    if (ok) toast.info('Descartamos el pedido; podés solicitar la caja de nuevo.', 'Pedido descartado');
    else toast.error('No se pudo descartar el pedido. Si ya pagaste, esperá unos segundos y actualizá el estado.');
    await refreshRequests();
  } finally {
    discarding.value = null;
  }
};

const handleBillingPortal = async (id: string) => {
  actionLoading.value = id;
  try {
    const res = await suscripcionesService.billingPortal(id);
    const url = safeCheckoutUrl(res.data?.url);
    if (!url) throw new Error('URL inválida');
    window.location.assign(url);
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'No se pudo abrir el portal de pagos');
  } finally {
    actionLoading.value = null;
  }
};

const askCancel = (id: string) => { cancelTarget.value = id; };
const confirmCancel = async () => {
  const id = cancelTarget.value;
  if (!id) return;
  await handleCancel(id);
  cancelTarget.value = null;
};

const handleCancel = async (id: string) => {
  actionLoading.value = id;
  try {
    await suscripcionesService.cancel(id);
    toast.info('Suscripción cancelada', 'Membresía dada de baja');
    await fetchMisSuscripciones();
  } catch (err: any) {
    toast.error(err.response?.data?.message || 'Error al cancelar la suscripción');
  } finally {
    actionLoading.value = null;
  }
};

const formatCategoria = (cat: string) =>
  ({ vinos: 'Vinos', cafes: 'Cafés', cervezas: 'Cervezas' }[cat] || cat);
</script>

<style scoped>
.confirm-dialog { max-width: 30rem; border: 1px solid var(--color-border); padding: 1.5rem; color: var(--color-dark); }
.confirm-dialog::backdrop { background: rgba(2, 2, 1, 0.6); }
.dialog-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
.my-subscriptions-section {
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  padding: 1.75rem;
  margin-bottom: 2.5rem;
  box-shadow: 0 2px 12px rgba(2, 2, 1, 0.04);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.75rem;
}

.section-title {
  font-family: var(--font-serif);
  font-size: 1.35rem;
  color: var(--color-dark);
  margin: 0;
}

.subscriptions-count {
  font-size: 0.8rem;
  color: var(--color-accent);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.empty-subs-box {
  text-align: center;
  padding: 2rem 1rem;
}

.empty-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.empty-subs-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-dark);
  margin: 0 0 0.35rem 0;
}

.empty-subs-hint {
  font-size: 0.85rem;
  color: var(--color-accent);
  margin: 0;
}

.subs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.sub-card {
  border: 1px solid var(--color-border);
  background-color: #faf8f6;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sub-cat {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-accent);
}

.sub-caja-title {
  font-family: var(--font-serif);
  font-size: 1.05rem;
  color: var(--color-dark);
  margin: 0.25rem 0;
}

.sub-price {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-dark);
}

.sub-meta {
  font-size: 0.75rem;
  color: var(--color-accent);
  margin-top: 0.25rem;
}

.sub-warning {
  margin: 0.5rem 0;
  padding: 0.5rem 0.75rem;
  border-left: 3px solid var(--color-accent, #b45309);
  background: rgba(180, 83, 9, 0.08);
  font-size: 0.875rem;
}
.sub-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.btn-outline-danger {
  background: transparent;
  border: 1px solid #b91c1c;
  color: #b91c1c;
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: var(--radius-xs);
  transition: all var(--transition-fast);
}

.btn-outline-danger:hover {
  background-color: #b91c1c;
  color: #ffffff;
}

.catalog-divider {
  margin-bottom: 1.5rem;
}

.cajas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.caja-card {
  background-color: #ffffff;
  border: 1px solid var(--color-border);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: box-shadow var(--transition-fast);
}

.caja-card:hover {
  box-shadow: 0 4px 16px rgba(2, 2, 1, 0.08);
}

.caja-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.periodo-tag {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-accent);
  letter-spacing: 0.05em;
}

.caja-nombre {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  color: var(--color-dark);
  margin: 0;
  line-height: 1.3;
}

.caja-desc {
  font-size: 0.825rem;
  color: var(--color-accent);
  margin: 0;
  line-height: 1.5;
}

.caja-price {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-dark);
  margin-top: 0.25rem;
}

.composiciones-list {
  font-size: 0.8rem;
  color: var(--color-dark);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.comp-label {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.72rem;
  color: var(--color-accent);
}

.comp-item {
  padding-left: 0.5rem;
  border-left: 2px solid var(--color-border);
}

.caja-footer {
  margin-top: auto;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.disponible-badge {
  font-size: 0.775rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  display: inline-block;
}

/* ── Sommelier IA Section ── */
.ia-sommelier-section {
  margin: 2.5rem 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.ia-banner {
  background-color: var(--color-dark);
  border: 1px solid var(--color-dark);
  border-radius: var(--radius-sm);
  padding: 1.75rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  color: var(--color-white);
}

.ia-header-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--color-accent);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.ia-title {
  font-family: var(--font-serif);
  font-size: 1.4rem;
  color: var(--color-white);
  margin: 0 0 0.5rem;
}

.ia-subtitle {
  font-size: 0.875rem;
  color: var(--color-border);
  margin: 0;
  max-width: 600px;
  line-height: 1.5;
}

.btn-ia {
  background-color: var(--color-light);
  color: var(--color-dark);
  font-weight: 600;
  padding: 0.85rem 1.6rem;
  border-radius: var(--radius-xs);
  border: 1px solid var(--color-light);
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.9rem;
  transition: all var(--transition-fast);
}

.btn-ia:hover:not(:disabled) {
  background-color: var(--color-white);
  color: var(--color-dark);
  border-color: var(--color-white);
}

.btn-ia:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ia-result-card {
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-dark);
  border-radius: var(--radius-sm);
  padding: 1.75rem;
}

.ia-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.ia-match-badge {
  background-color: var(--color-success-bg);
  color: var(--color-success);
  font-weight: 700;
  font-size: 0.825rem;
  padding: 0.35rem 0.8rem;
  border-radius: var(--radius-xs);
  border: 1px solid var(--color-success);
}

.ia-model-badge {
  font-size: 0.75rem;
  color: var(--color-muted);
  font-family: var(--font-sans);
}

.ia-result-body {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 2rem;
}

@media (max-width: 768px) {
  .ia-banner {
    flex-direction: column;
    align-items: flex-start;
  }
  .ia-result-body {
    grid-template-columns: 1fr;
  }
}

.ia-caja-title {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  color: var(--color-dark);
  margin: 0.25rem 0;
}

.ia-caja-desc {
  font-size: 0.85rem;
  color: var(--color-muted);
  margin: 0.25rem 0 0.75rem;
}

.ia-caja-price {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-dark);
  margin-bottom: 1rem;
}

.ia-comp-list {
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.ia-sommelier-note {
  background-color: var(--color-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xs);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.note-label {
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
  color: var(--color-dark);
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.note-text {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-dark);
  font-style: italic;
  margin: 0 0 1.25rem;
}

.note-actions {
  display: flex;
  justify-content: flex-end;
}

.ia-error-alert {
  background-color: var(--color-danger-bg);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
  padding: 0.85rem 1.25rem;
  border-radius: var(--radius-xs);
  font-size: 0.875rem;
}
</style>
