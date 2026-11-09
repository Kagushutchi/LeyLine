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

      <div v-else-if="misSuscripciones.length === 0" class="empty-subs-box">
        <span class="empty-icon">🍷</span>
        <p class="empty-subs-text">Aún no tienes suscripciones activas vinculadas a tu cuenta.</p>
        <p class="empty-subs-hint">Elige una de las cajas exclusivas del catálogo a continuación para comenzar tu experiencia.</p>
      </div>

      <div v-else class="subs-grid">
        <div v-for="sub in misSuscripciones" :key="sub.id" class="sub-card">
          <div class="sub-header">
            <span class="badge" :class="sub.estado === 'activa' ? 'badge-success' : 'badge-warning'">
              {{ sub.estado.toUpperCase() }}
            </span>
            <span class="sub-cat">{{ formatCategoria(sub.categoria) }}</span>
          </div>
          <h3 class="sub-caja-title">{{ sub.cajaMensual?.nombre || 'Caja de Membresía' }}</h3>
          <div class="sub-price">
            ${{ Number(sub.montoMensual).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }} / mes
          </div>
          <div class="sub-meta">
            <span v-if="sub.proximoCobro" class="meta-item">
              📅 Próximo cobro: {{ new Date(sub.proximoCobro).toLocaleDateString('es-AR') }}
            </span>
          </div>
          <div class="sub-actions">
            <button
              v-if="sub.estado === 'activa'"
              class="btn btn-secondary btn-sm"
              @click="handlePause(sub.id)"
              :disabled="actionLoading === sub.id"
            >
              Pausar
            </button>
            <button
              v-if="sub.estado !== 'cancelada'"
              class="btn btn-outline-danger btn-sm"
              @click="handleCancel(sub.id)"
              :disabled="actionLoading === sub.id"
            >
              Cancelar
            </button>
          </div>
        </div>
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
            @click="handleSubscribe(caja)"
            :disabled="actionLoading === caja.id"
          >
            <span v-if="actionLoading === caja.id">Procesando...</span>
            <span v-else>Suscribirme</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCajasMensualesStore } from '@/modules/cajas-mensuales/store/cajas-mensuales.store';
import { suscripcionesService, SuscripcionDTO } from '@/modules/suscripciones/services/suscripciones.service';
import { useToastStore } from '@/common/store/toast.store';

const store = useCajasMensualesStore();
const toast = useToastStore();

const misSuscripciones = ref<SuscripcionDTO[]>([]);
const loadingSuscripciones = ref<boolean>(false);
const actionLoading = ref<string | null>(null);

const fetchMisSuscripciones = async () => {
  loadingSuscripciones.value = true;
  try {
    const res: any = await suscripcionesService.getAll();
    misSuscripciones.value = Array.isArray(res.data) ? res.data : [];
  } catch {
    misSuscripciones.value = [];
  } finally {
    loadingSuscripciones.value = false;
  }
};

onMounted(async () => {
  await Promise.all([
    store.fetchCajas(),
    fetchMisSuscripciones(),
  ]);
});

const isSubscribedTo = (cajaId: string) => {
  return misSuscripciones.value.some(
    (s) => s.cajaMensualId === cajaId && s.estado !== 'cancelada'
  );
};

const handleSubscribe = async (caja: any) => {
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
  ({ vinos: '🍷 Vinos', cafes: '☕ Cafés', cervezas: '🍺 Cervezas' }[cat] || cat);
</script>

<style scoped>
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
</style>
