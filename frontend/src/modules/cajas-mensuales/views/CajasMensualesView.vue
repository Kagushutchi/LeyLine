<template>
  <div class="container">
    <div class="view-header">
      <div>
        <h1 class="view-title">Cajas Mensuales (Catálogo)</h1>
        <p class="view-subtitle">Curaduría temática de selecciones mensuales para vinos, cafés y cervezas.</p>
      </div>
      <div v-if="authStore.isAdmin" class="header-buttons">
        <button class="btn btn-ia-admin" :disabled="loadingSuggestion" @click="pedirSugerenciaIA">
          <span v-if="loadingSuggestion">Analizando clientes...</span>
          <span v-else>Sugerir Caja con IA</span>
        </button>
        <button class="btn btn-primary" @click="openCreateModal">
          + Nueva Caja Mensual
        </button>
      </div>
    </div>

    <!-- Panel de Sugerencia Comercial Sommelier IA para el Administrador -->
    <div v-if="aiSuggestion" class="admin-ia-panel">
      <div class="ia-panel-header">
        <div class="ia-badge-group">
          <span class="sparkle-tag">SOMMELIER ESTRATÉGICO (GOOGLE GEMINI)</span>
          <span class="affinity-tag">{{ aiSuggestion.porcentajeAudienciaAfin }}% Afinidad con tu audiencia</span>
        </div>
        <button class="close-ia-btn" title="Cerrar sugerencia" @click="aiSuggestion = null">&times;</button>
      </div>

      <div class="ia-panel-grid">
        <div class="ia-suggested-box">
          <span class="badge badge-accent mb-2">{{ formatCategoria(aiSuggestion.categoria) }}</span>
          <h2 class="suggested-name">{{ aiSuggestion.nombreSugerido }}</h2>
          <p class="suggested-desc">{{ aiSuggestion.descripcion }}</p>
          <div class="suggested-price">
            Precio sugerido: <strong>${{ Number(aiSuggestion.precioSugerido).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}</strong>
          </div>

          <div v-if="aiSuggestion.composicionSugerida?.length" class="suggested-comp">
            <span class="comp-title">Composición recomendada de tu inventario:</span>
            <ul>
              <li v-for="comp in aiSuggestion.composicionSugerida" :key="comp.productoId">
                <strong>{{ comp.cantidad }}x</strong> {{ comp.nombreProducto }}
              </li>
            </ul>
          </div>
        </div>

        <div class="ia-justification-box">
          <div class="justification-header">Análisis de Demanda y Oportunidad:</div>
          <p class="justification-text">{{ aiSuggestion.justificacionComercial }}</p>
          <div class="ia-action-row">
            <button class="btn btn-ia-apply" @click="aplicarSugerencia">
              Crear Caja con esta Sugerencia
            </button>
          </div>
        </div>
      </div>
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
      <button v-if="authStore.isAdmin" class="btn btn-primary" @click="openCreateModal">+ Crear Primer Caja</button>
      <p v-else class="state-desc">Iniciá sesión como administrador para crear cajas mensuales.</p>
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
              <div v-if="authStore.isAdmin" class="actions-cell">
                <button class="btn btn-secondary btn-sm" @click="openEditModal(item)">
                  Modificar
                </button>
                <button class="btn btn-danger btn-sm" @click="confirmDelete(item)">
                  Eliminar
                </button>
              </div>
              <span v-else class="text-muted">—</span>
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
import { CajaMensualDTO, AdminBoxSuggestionDTO, cajasMensualesService } from '../services/cajas-mensuales.service';
import CajaMensualModal from '../components/CajaMensualModal.vue';
import ConfirmModal from '@/common/components/ConfirmModal.vue';
import { useAuthStore } from '@/common/store/auth.store';

const store = useCajasMensualesStore();
const toast = useToastStore();
const authStore = useAuthStore();

const isModalOpen = ref(false);
const selectedItem = ref<CajaMensualDTO | null>(null);
const isSaving = ref(false);

const isDeleteModalOpen = ref(false);
const itemToDelete = ref<CajaMensualDTO | null>(null);
const isDeleting = ref(false);

// Estado de la Sugerencia IA para el Administrador
const aiSuggestion = ref<AdminBoxSuggestionDTO | null>(null);
const loadingSuggestion = ref(false);

const pedirSugerenciaIA = async () => {
  loadingSuggestion.value = true;
  try {
    const res = await cajasMensualesService.suggestForAdmin();
    if (res.data) {
      aiSuggestion.value = res.data;
      toast.success('¡El Sommelier Estratégico analizó a tus suscriptores y generó una sugerencia!', 'Análisis completado');
    }
  } catch (err: any) {
    const msg = err.response?.data?.message || err.message || 'No se pudo generar la sugerencia de IA.';
    toast.error(msg, 'Error Sommelier IA');
  } finally {
    loadingSuggestion.value = false;
  }
};

const aplicarSugerencia = () => {
  if (!aiSuggestion.value) return;
  const s = aiSuggestion.value;
  const currentDate = new Date();

  // Armar un DTO parcial sin id para que CajaMensualModal lo abra en modo creación pre-llenado
  selectedItem.value = {
    id: '', // id vacío -> modo nueva caja
    nombre: s.nombreSugerido,
    categoria: s.categoria,
    mes: currentDate.getMonth() + 1,
    anio: currentDate.getFullYear(),
    precioBase: s.precioSugerido,
    descripcion: s.descripcion,
    disponible: true,
  } as CajaMensualDTO;

  isModalOpen.value = true;
};

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

.header-buttons {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.btn-ia-admin {
  background-color: var(--color-dark);
  color: var(--color-light);
  border: 1px solid var(--color-dark);
  font-weight: 600;
  padding: 0.55rem 1.1rem;
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-ia-admin:hover:not(:disabled) {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-white);
}

.btn-ia-admin:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Admin IA Panel ── */
.admin-ia-panel {
  background-color: var(--color-white);
  border: 1px solid var(--color-border);
  border-top: 4px solid var(--color-dark);
  border-radius: var(--radius-sm);
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.ia-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.ia-badge-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sparkle-tag {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-accent);
  text-transform: uppercase;
}

.affinity-tag {
  background-color: var(--color-success-bg);
  color: var(--color-success);
  font-size: 0.775rem;
  font-weight: 700;
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-xs);
  border: 1px solid var(--color-success);
}

.close-ia-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  color: var(--color-muted);
  cursor: pointer;
  line-height: 1;
  transition: color var(--transition-fast);
}

.close-ia-btn:hover {
  color: var(--color-dark);
}

.ia-panel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.75rem;
}

@media (max-width: 850px) {
  .ia-panel-grid {
    grid-template-columns: 1fr;
  }
}

.suggested-name {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  color: var(--color-dark);
  margin: 0.25rem 0 0.5rem;
}

.suggested-desc {
  font-size: 0.85rem;
  color: var(--color-muted);
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.suggested-price {
  font-size: 0.9rem;
  color: var(--color-dark);
  margin-bottom: 1rem;
}

.suggested-comp {
  font-size: 0.825rem;
  background-color: var(--color-light);
  padding: 0.85rem;
  border-radius: var(--radius-xs);
  border: 1px solid var(--color-border);
}

.comp-title {
  font-weight: 600;
  display: block;
  margin-bottom: 0.35rem;
  color: var(--color-dark);
}

.suggested-comp ul {
  list-style: none;
  padding-left: 0;
  margin: 0;
}

.suggested-comp li {
  padding: 0.2rem 0;
  border-bottom: 1px dashed var(--color-border);
}

.suggested-comp li:last-child {
  border-bottom: none;
}

.ia-justification-box {
  background-color: var(--color-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xs);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.justification-header {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-dark);
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.justification-text {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-dark);
  font-style: italic;
  margin-bottom: 1rem;
}

.ia-action-row {
  display: flex;
  justify-content: flex-end;
}

.btn-ia-apply {
  background-color: var(--color-dark);
  color: var(--color-white);
  border: 1px solid var(--color-dark);
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.65rem 1.25rem;
  border-radius: var(--radius-xs);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-ia-apply:hover {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
}
</style>
