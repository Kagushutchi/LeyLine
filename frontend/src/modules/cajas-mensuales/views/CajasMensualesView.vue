<template>
  <div class="container">
    <div class="view-header">
      <div>
        <h1 class="view-title">Cajas Mensuales (Catálogo)</h1>
        <p class="view-subtitle">Curaduría temática de selecciones mensuales para vinos, cafés y cervezas.</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        + Nueva Caja Mensual
      </button>
    </div>

    <!-- Estado de Carga -->
    <div v-if="store.loading && store.cajas.length === 0" class="state-box">
      <h3 class="state-title">Cargando catálogo</h3>
      <p class="state-desc">Recuperando cajas temáticas mensuales...</p>
    </div>

    <!-- Estado de Error -->
    <div v-else-if="store.error && store.cajas.length === 0" class="state-box">
      <h3 class="state-title">Error al consultar catálogo</h3>
      <p class="state-desc">{{ store.error }}</p>
      <button class="btn btn-secondary" @click="store.fetchCajas">Reintentar</button>
    </div>

    <!-- Estado Vacío -->
    <div v-else-if="store.cajas.length === 0" class="state-box">
      <h3 class="state-title">Sin cajas mensuales registradas</h3>
      <p class="state-desc">Crea tu primera selección mensual temática para los suscriptores.</p>
      <button class="btn btn-primary" @click="openCreateModal">+ Crear Primer Caja</button>
    </div>

    <!-- Tabla de Cajas Mensuales -->
    <div v-else class="table-container">
      <table class="luxury-table">
        <thead>
          <tr>
            <th>Selección / Caja</th>
            <th>Categoría</th>
            <th>Período</th>
            <th>Precio Base</th>
            <th>Disponibilidad</th>
            <th style="text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in store.cajas" :key="item.id">
            <td>
              <div class="box-name">{{ item.nombre }}</div>
              <p v-if="item.descripcion" class="box-desc">{{ item.descripcion }}</p>
            </td>
            <td>
              <span class="badge badge-dark">
                {{ formatCategoria(item.categoria) }}
              </span>
            </td>
            <td>
              <span class="period-label">{{ getMesName(item.mes) }} {{ item.anio }}</span>
            </td>
            <td>
              <span class="currency-amount">${{ Number(item.precioBase).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}</span>
            </td>
            <td>
              <span class="badge" :class="item.disponible ? 'badge-success' : 'badge-warning'">
                {{ item.disponible ? 'Disponible' : 'Agotada / Pausada' }}
              </span>
            </td>
            <td>
              <div class="actions-cell">
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

    <!-- Modal Formulario -->
    <CajaMensualModal
      :is-open="isModalOpen"
      :caja="selectedItem"
      :saving="isSaving"
      @close="isModalOpen = false"
      @save="handleSave"
    />

    <!-- Modal Confirmación Eliminación -->
    <ConfirmModal
      :is-open="isDeleteModalOpen"
      title="Eliminar Caja Mensual"
      :message="`¿Estás seguro de que deseas eliminar permanentemente la caja '${itemToDelete?.nombre || ''}'? Esta acción no se puede deshacer.`"
      confirm-label="Eliminar Caja"
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="isDeleteModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCajasMensualesStore } from '../store/cajas-mensuales.store';
import { useToastStore } from '@/common/store/toast.store';
import { CajaMensualDTO } from '../services/cajas-mensuales.service';
import CajaMensualModal from '../components/CajaMensualModal.vue';
import ConfirmModal from '@/common/components/ConfirmModal.vue';

const store = useCajasMensualesStore();
const toast = useToastStore();

const isModalOpen = ref(false);
const selectedItem = ref<CajaMensualDTO | null>(null);
const isSaving = ref(false);

const isDeleteModalOpen = ref(false);
const itemToDelete = ref<CajaMensualDTO | null>(null);
const isDeleting = ref(false);

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

onMounted(() => {
  store.fetchCajas();
});

const formatCategoria = (cat: string) => {
  if (cat === 'vinos') return 'Vinos';
  if (cat === 'cafes') return 'Café';
  if (cat === 'cervezas') return 'Cervezas';
  return cat;
};

const getMesName = (m: number) => {
  return meses[m - 1] || `Mes ${m}`;
};

const openCreateModal = () => {
  selectedItem.value = null;
  isModalOpen.value = true;
};

const openEditModal = (item: CajaMensualDTO) => {
  selectedItem.value = item;
  isModalOpen.value = true;
};

const handleSave = async (payload: Partial<CajaMensualDTO>) => {
  isSaving.value = true;
  try {
    if (selectedItem.value?.id) {
      await store.updateCaja(selectedItem.value.id, payload);
      toast.success('Caja mensual modificada con éxito');
    } else {
      await store.createCaja(payload);
      toast.success('Caja mensual creada con éxito');
    }
    isModalOpen.value = false;
  } catch (error: unknown) {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    const msg = e.response?.data?.message || e.message || 'No se pudo guardar la caja mensual';
    toast.error(msg, 'Error al guardar caja mensual');
  } finally {
    isSaving.value = false;
  }
};

const confirmDelete = (item: CajaMensualDTO) => {
  itemToDelete.value = item;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!itemToDelete.value?.id) return;
  isDeleting.value = true;
  try {
    await store.deleteCaja(itemToDelete.value.id);
    toast.success('Caja mensual eliminada con éxito');
    isDeleteModalOpen.value = false;
  } catch (error: unknown) {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    const msg = e.response?.data?.message || e.message || 'No se pudo eliminar la caja';
    toast.error(msg, 'Error al eliminar');
  } finally {
    isDeleting.value = false;
  }
};
</script>

<style scoped>
.box-name {
  font-weight: 600;
  color: var(--color-dark);
}

.box-desc {
  font-size: 0.775rem;
  color: var(--color-muted);
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.15rem;
}

.period-label {
  font-weight: 500;
}

.currency-amount {
  font-weight: 600;
}
</style>
