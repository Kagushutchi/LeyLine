<template>
  <div class="container">
    <div class="view-header">
      <div>
        <h1 class="view-title">Suscripciones (Membresías)</h1>
        <p class="view-subtitle">Control de cobros periódicos, asignación de cajas y estados de membresía.</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        + Nueva Suscripción
      </button>
    </div>

    <!-- Estado de Carga -->
    <div v-if="store.loading && store.suscripciones.length === 0" class="state-box">
      <h3 class="state-title">Cargando membresías</h3>
      <p class="state-desc">Recuperando suscripciones activas del sistema...</p>
    </div>

    <!-- Estado de Error -->
    <div v-else-if="store.error && store.suscripciones.length === 0" class="state-box">
      <h3 class="state-title">Error al consultar datos</h3>
      <p class="state-desc">{{ store.error }}</p>
      <button class="btn btn-secondary" @click="loadData">Reintentar</button>
    </div>

    <!-- Estado Vacío -->
    <div v-else-if="store.suscripciones.length === 0" class="state-box">
      <h3 class="state-title">Sin suscripciones registradas</h3>
      <p class="state-desc">Asocia suscriptores a sus cajas mensuales para comenzar el flujo de recurrencia.</p>
      <button class="btn btn-primary" @click="openCreateModal">+ Crear Primer Suscripción</button>
    </div>

    <!-- Tabla de Suscripciones -->
    <div v-else class="table-container">
      <table class="luxury-table">
        <thead>
          <tr>
            <th>Suscriptor</th>
            <th>Caja Asignada</th>
            <th>Categoría</th>
            <th>Monto Mensual</th>
            <th>Próximo Cobro</th>
            <th>Estado</th>
            <th style="text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in store.suscripciones" :key="item.id">
            <td>
              <div class="member-name">{{ getSuscriptorName(item) }}</div>
              <span class="text-muted" style="font-size: 0.75rem;">ID: {{ item.suscriptorId.substring(0, 8) }}...</span>
            </td>
            <td>
              <div>{{ getCajaName(item) }}</div>
            </td>
            <td>
              <span class="badge badge-outline">
                {{ formatCategoria(item.categoria) }}
              </span>
            </td>
            <td>
              <span class="currency-amount">${{ Number(item.montoMensual).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}</span>
            </td>
            <td>
              <span>{{ formatDate(item.proximoCobro) }}</span>
            </td>
            <td>
              <span class="badge" :class="statusBadgeClass(item.estado)">
                {{ item.estado }}
              </span>
            </td>
            <td>
              <div class="actions-cell">
                <button
                  v-if="item.estado === 'activa'"
                  class="btn btn-secondary btn-sm"
                  title="Pausar Suscripción"
                  @click="handlePause(item.id)"
                >
                  Pausar
                </button>
                <button
                  v-if="item.estado !== 'cancelada'"
                  class="btn btn-secondary btn-sm"
                  title="Cancelar Suscripción"
                  @click="handleCancel(item.id)"
                >
                  Cancelar
                </button>
                <button class="btn btn-secondary btn-sm" @click="openEditModal(item)">
                  Modificar
                </button>
                <button class="btn btn-danger btn-sm" @click="confirmDelete(item)">
                  Eliminar
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Crear / Modificar -->
    <SuscripcionModal
      :is-open="isModalOpen"
      :suscripcion="selectedItem"
      :suscriptores-list="suscriptoresStore.suscriptores"
      :cajas-list="cajasStore.cajas"
      :saving="isSaving"
      @close="isModalOpen = false"
      @save="handleSave"
    />

    <!-- Modal Confirmar Eliminación -->
    <ConfirmModal
      :is-open="isDeleteModalOpen"
      title="Eliminar Suscripción"
      message="¿Estás seguro de que deseas eliminar permanentemente este registro de suscripción? Esta acción no se puede deshacer."
      confirm-label="Eliminar Suscripción"
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="isDeleteModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSuscripcionesStore } from '../store/suscripciones.store';
import { useSuscriptoresStore } from '../../suscriptores/store/suscriptores.store';
import { useCajasMensualesStore } from '../../cajas-mensuales/store/cajas-mensuales.store';
import { useToastStore } from '@/common/store/toast.store';
import { SuscripcionDTO } from '../services/suscripciones.service';
import SuscripcionModal from '../components/SuscripcionModal.vue';
import ConfirmModal from '@/common/components/ConfirmModal.vue';

const store = useSuscripcionesStore();
const suscriptoresStore = useSuscriptoresStore();
const cajasStore = useCajasMensualesStore();
const toast = useToastStore();

const isModalOpen = ref(false);
const selectedItem = ref<SuscripcionDTO | null>(null);
const isSaving = ref(false);

const isDeleteModalOpen = ref(false);
const itemToDelete = ref<SuscripcionDTO | null>(null);
const isDeleting = ref(false);

const loadData = async () => {
  await Promise.all([
    store.fetchSuscripciones(),
    suscriptoresStore.fetchSuscriptores(),
    cajasStore.fetchCajas(),
  ]);
};

onMounted(() => {
  loadData();
});

const getSuscriptorName = (item: SuscripcionDTO) => {
  if (item.suscriptor?.nombre) {
    return `${item.suscriptor.nombre} ${item.suscriptor.apellido || ''}`.trim();
  }
  const match = suscriptoresStore.suscriptores.find((s) => s.id === item.suscriptorId);
  return match ? `${match.nombre} ${match.apellido || ''}`.trim() : item.suscriptorId;
};

const getCajaName = (item: SuscripcionDTO) => {
  if (item.cajaMensual?.nombre) {
    return item.cajaMensual.nombre;
  }
  const match = cajasStore.cajas.find((c) => c.id === item.cajaMensualId);
  return match ? match.nombre : item.cajaMensualId;
};

const formatCategoria = (cat: string) => {
  if (cat === 'vinos') return 'Vinos';
  if (cat === 'cafes') return 'Café';
  if (cat === 'cervezas') return 'Cervezas';
  return cat;
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('es-AR');
  } catch {
    return dateStr;
  }
};

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'activa':
      return 'badge-success';
    case 'pausada':
      return 'badge-warning';
    case 'cancelada':
      return 'badge-danger';
    default:
      return 'badge-outline';
  }
};

const openCreateModal = () => {
  selectedItem.value = null;
  isModalOpen.value = true;
};

const openEditModal = (item: SuscripcionDTO) => {
  selectedItem.value = item;
  isModalOpen.value = true;
};

const handleSave = async (payload: Partial<SuscripcionDTO>) => {
  isSaving.value = true;
  try {
    if (selectedItem.value?.id) {
      await store.updateSuscripcion(selectedItem.value.id, payload);
      toast.success('Suscripción modificada con éxito');
    } else {
      await store.createSuscripcion(payload);
      toast.success('Suscripción creada con éxito');
    }
    isModalOpen.value = false;
  } catch (error: unknown) {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    const msg = e.response?.data?.message || e.message || 'No se pudo guardar la suscripción';
    toast.error(msg, 'Error al guardar suscripción');
  } finally {
    isSaving.value = false;
  }
};

const handlePause = async (id: string) => {
  try {
    await store.pauseSuscripcion(id);
    toast.success('Suscripción pausada con éxito');
  } catch (error: unknown) {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    const msg = e.response?.data?.message || e.message || 'No se pudo pausar';
    toast.error(msg, 'Error al pausar');
  }
};

const handleCancel = async (id: string) => {
  try {
    await store.cancelSuscripcion(id);
    toast.success('Suscripción cancelada con éxito');
  } catch (error: unknown) {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    const msg = e.response?.data?.message || e.message || 'No se pudo cancelar';
    toast.error(msg, 'Error al cancelar');
  }
};

const confirmDelete = (item: SuscripcionDTO) => {
  itemToDelete.value = item;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!itemToDelete.value?.id) return;
  isDeleting.value = true;
  try {
    await store.deleteSuscripcion(itemToDelete.value.id);
    toast.success('Suscripción eliminada con éxito');
    isDeleteModalOpen.value = false;
  } catch (error: unknown) {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    const msg = e.response?.data?.message || e.message || 'No se pudo eliminar la suscripción';
    toast.error(msg, 'Error al eliminar');
  } finally {
    isDeleting.value = false;
  }
};
</script>

<style scoped>
.member-name {
  font-weight: 600;
  color: var(--color-dark);
}

.currency-amount {
  font-weight: 600;
  color: var(--color-dark);
}
</style>
