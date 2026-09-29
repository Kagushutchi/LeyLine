<template>
  <div class="container">
    <div class="view-header">
      <div>
        <h1 class="view-title">Suscriptores (Clientes)</h1>
        <p class="view-subtitle">Gestión de miembros exclusivos y registro de perfil organoléptico.</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        + Nuevo Suscriptor
      </button>
    </div>

    <!-- Estado de Carga -->
    <div v-if="store.loading && store.suscriptores.length === 0" class="state-box">
      <h3 class="state-title">Cargando suscriptores</h3>
      <p class="state-desc">Recuperando registros del servidor...</p>
    </div>

    <!-- Estado de Error -->
    <div v-else-if="store.error && store.suscriptores.length === 0" class="state-box">
      <h3 class="state-title">Error al consultar datos</h3>
      <p class="state-desc">{{ store.error }}</p>
      <button class="btn btn-secondary" @click="store.fetchSuscriptores">Reintentar</button>
    </div>

    <!-- Estado Vacío -->
    <div v-else-if="store.suscriptores.length === 0" class="state-box">
      <h3 class="state-title">Sin suscriptores registrados</h3>
      <p class="state-desc">Comienza registrando al primer miembro para este club de especialidad.</p>
      <button class="btn btn-primary" @click="openCreateModal">+ Crear Primer Suscriptor</button>
    </div>

    <!-- Tabla de Datos -->
    <div v-else class="table-container">
      <table class="luxury-table">
        <thead>
          <tr>
            <th>Miembro</th>
            <th>Contacto</th>
            <th>Club & Sabor</th>
            <th>Ubicación</th>
            <th>Estado</th>
            <th style="text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in store.suscriptores" :key="item.id">
            <td>
              <div class="member-name">{{ item.nombre }} {{ item.apellido || '' }}</div>
              <span v-if="item.documento" class="member-doc">Doc: {{ item.documento }}</span>
            </td>
            <td>
              <div class="contact-email">{{ item.email }}</div>
              <div v-if="item.telefono" class="contact-phone">{{ item.telefono }}</div>
            </td>
            <td>
              <span class="badge badge-accent">
                {{ formatCategoria(item.preferenciasOrganolepticas?.categoria) }}
              </span>
              <div v-if="item.preferenciasOrganolepticas?.perfilSabor?.length" class="flavor-notes">
                {{ item.preferenciasOrganolepticas.perfilSabor.slice(0, 3).join(', ') }}
              </div>
            </td>
            <td>
              <span>{{ item.direccion?.ciudad || '—' }}</span>
              <span v-if="item.direccion?.provincia" class="text-muted">, {{ item.direccion.provincia }}</span>
            </td>
            <td>
              <span class="badge" :class="item.activo ? 'badge-success' : 'badge-warning'">
                {{ item.activo ? 'Activo' : 'Inactivo' }}
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
    <SuscriptorModal
      :is-open="isModalOpen"
      :suscriptor="selectedItem"
      :saving="isSaving"
      @close="isModalOpen = false"
      @save="handleSave"
    />

    <!-- Modal Confirmación de Eliminación -->
    <ConfirmModal
      :is-open="isDeleteModalOpen"
      title="Eliminar Suscriptor"
      :message="`¿Estás seguro de que deseas eliminar permanentemente a ${itemToDelete?.nombre || 'este suscriptor'}? Esta acción no se puede deshacer.`"
      confirm-label="Eliminar Suscriptor"
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="isDeleteModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSuscriptoresStore } from '../store/suscriptores.store';
import { useToastStore } from '@/common/store/toast.store';
import { SuscriptorDTO } from '../services/suscriptores.service';
import SuscriptorModal from '../components/SuscriptorModal.vue';
import ConfirmModal from '@/common/components/ConfirmModal.vue';

const store = useSuscriptoresStore();
const toast = useToastStore();

const isModalOpen = ref(false);
const selectedItem = ref<SuscriptorDTO | null>(null);
const isSaving = ref(false);

const isDeleteModalOpen = ref(false);
const itemToDelete = ref<SuscriptorDTO | null>(null);
const isDeleting = ref(false);

onMounted(() => {
  store.fetchSuscriptores();
});

const formatCategoria = (cat?: string) => {
  if (cat === 'vinos') return 'Vinos';
  if (cat === 'cafes') return 'Café';
  if (cat === 'cervezas') return 'Cervezas';
  return cat || 'General';
};

const openCreateModal = () => {
  selectedItem.value = null;
  isModalOpen.value = true;
};

const openEditModal = (item: SuscriptorDTO) => {
  selectedItem.value = item;
  isModalOpen.value = true;
};

const handleSave = async (payload: Partial<SuscriptorDTO>) => {
  isSaving.value = true;
  try {
    if (selectedItem.value?.id) {
      await store.updateSuscriptor(selectedItem.value.id, payload);
      toast.success('Suscriptor modificado con éxito');
    } else {
      await store.createSuscriptor(payload);
      toast.success('Suscriptor creado con éxito');
    }
    isModalOpen.value = false;
  } catch (error: unknown) {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    const msg = e.response?.data?.message || e.message || 'No se pudo guardar el suscriptor';
    toast.error(msg, 'Error al guardar suscriptor');
  } finally {
    isSaving.value = false;
  }
};

const confirmDelete = (item: SuscriptorDTO) => {
  itemToDelete.value = item;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!itemToDelete.value?.id) return;
  isDeleting.value = true;
  try {
    await store.deleteSuscriptor(itemToDelete.value.id);
    toast.success('Suscriptor eliminado con éxito');
    isDeleteModalOpen.value = false;
  } catch (error: unknown) {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    const msg = e.response?.data?.message || e.message || 'No se pudo eliminar el suscriptor';
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

.member-doc {
  display: block;
  font-size: 0.75rem;
  color: var(--color-muted);
}

.contact-email {
  font-weight: 500;
}

.contact-phone {
  font-size: 0.775rem;
  color: var(--color-muted);
}

.flavor-notes {
  font-size: 0.775rem;
  color: var(--color-muted);
  margin-top: 0.25rem;
}
</style>
