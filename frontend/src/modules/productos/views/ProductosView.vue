<template>
  <div class="container">
    <div class="view-header">
      <div>
        <h1 class="view-title">Productos (Inventario & Bodega)</h1>
        <p class="view-subtitle">Catálogo de botellas, microlotes de café y variedades para composición de cajas.</p>
      </div>
      <button class="btn btn-primary" @click="openCreateModal">
        + Nuevo Producto
      </button>
    </div>

    <!-- Feedback -->
    <div v-if="successMessage" class="alert alert-success">
      {{ successMessage }}
    </div>

    <!-- Estado de Carga -->
    <div v-if="store.loading && store.productos.length === 0" class="state-box">
      <h3 class="state-title">Cargando inventario</h3>
      <p class="state-desc">Recuperando catálogo de productos...</p>
    </div>

    <!-- Estado de Error -->
    <div v-else-if="store.error && store.productos.length === 0" class="state-box">
      <h3 class="state-title">Error al consultar datos</h3>
      <p class="state-desc">{{ store.error }}</p>
      <button class="btn btn-secondary" @click="store.fetchProductos">Reintentar</button>
    </div>

    <!-- Estado Vacío -->
    <div v-else-if="store.productos.length === 0" class="state-box">
      <h3 class="state-title">Sin productos registrados</h3>
      <p class="state-desc">Registra etiquetas y microlotes para componer las cajas temáticas mensuales.</p>
      <button class="btn btn-primary" @click="openCreateModal">+ Crear Primer Producto</button>
    </div>

    <!-- Tabla de Productos -->
    <div v-else class="table-container">
      <table class="luxury-table">
        <thead>
          <tr>
            <th>Producto / Etiqueta</th>
            <th>Categoría & Tipo</th>
            <th>Productor</th>
            <th>Notas de Cata</th>
            <th>Precio Ref.</th>
            <th>Estado</th>
            <th style="text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in store.productos" :key="item.id">
            <td>
              <div class="product-name">{{ item.nombre }}</div>
              <span v-if="item.sku" class="sku-tag">SKU: {{ item.sku }}</span>
              <p v-if="item.descripcion" class="product-desc">{{ item.descripcion }}</p>
            </td>
            <td>
              <span class="badge badge-accent">
                {{ formatCategoria(item.categoria) }}
              </span>
              <div class="type-label">{{ item.tipo }}</div>
            </td>
            <td>
              <div class="producer-name">{{ item.productor }}</div>
            </td>
            <td>
              <div v-if="item.perfilNotas?.length" class="flavor-pills">
                <span v-for="nota in item.perfilNotas.slice(0, 3)" :key="nota" class="flavor-pill">
                  {{ nota }}
                </span>
              </div>
              <span v-else class="text-muted" style="font-size: 0.775rem;">Sin notas cargadas</span>
            </td>
            <td>
              <span v-if="item.precioReferencia" class="currency-amount">
                ${{ Number(item.precioReferencia).toLocaleString('es-AR', { minimumFractionDigits: 2 }) }}
              </span>
              <span v-else class="text-muted">—</span>
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
    <ProductoModal
      :is-open="isModalOpen"
      :producto="selectedItem"
      :saving="isSaving"
      @close="isModalOpen = false"
      @save="handleSave"
    />

    <!-- Modal Confirmación Eliminación -->
    <ConfirmModal
      :is-open="isDeleteModalOpen"
      title="Eliminar Producto"
      :message="`¿Estás seguro de que deseas eliminar permanentemente el producto '${itemToDelete?.nombre || ''}'? Esta acción no se puede deshacer.`"
      confirm-label="Eliminar Producto"
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="isDeleteModalOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useProductosStore } from '../store/productos.store';
import { ProductoDTO } from '../services/productos.service';
import ProductoModal from '../components/ProductoModal.vue';
import ConfirmModal from '@/common/components/ConfirmModal.vue';

const store = useProductosStore();

const isModalOpen = ref(false);
const selectedItem = ref<ProductoDTO | null>(null);
const isSaving = ref(false);

const isDeleteModalOpen = ref(false);
const itemToDelete = ref<ProductoDTO | null>(null);
const isDeleting = ref(false);

const successMessage = ref('');

onMounted(() => {
  store.fetchProductos();
});

const formatCategoria = (cat: string) => {
  if (cat === 'vinos') return 'Vinos';
  if (cat === 'cafes') return 'Café';
  if (cat === 'cervezas') return 'Cervezas';
  return cat;
};

const openCreateModal = () => {
  selectedItem.value = null;
  isModalOpen.value = true;
};

const openEditModal = (item: ProductoDTO) => {
  selectedItem.value = item;
  isModalOpen.value = true;
};

const handleSave = async (payload: Partial<ProductoDTO>) => {
  isSaving.value = true;
  try {
    if (selectedItem.value?.id) {
      await store.updateProducto(selectedItem.value.id, payload);
      showSuccess('Producto actualizado exitosamente.');
    } else {
      await store.createProducto(payload);
      showSuccess('Producto registrado en bodega exitosamente.');
    }
    isModalOpen.value = false;
  } catch (error) {
    console.error('Error al guardar producto:', error);
  } finally {
    isSaving.value = false;
  }
};

const confirmDelete = (item: ProductoDTO) => {
  itemToDelete.value = item;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!itemToDelete.value?.id) return;
  isDeleting.value = true;
  try {
    await store.deleteProducto(itemToDelete.value.id);
    showSuccess('Producto eliminado correctamente.');
    isDeleteModalOpen.value = false;
  } catch (error) {
    console.error('Error al eliminar producto:', error);
  } finally {
    isDeleting.value = false;
  }
};

const showSuccess = (msg: string) => {
  successMessage.value = msg;
  setTimeout(() => {
    successMessage.value = '';
  }, 4000);
};
</script>

<style scoped>
.product-name {
  font-weight: 600;
  color: var(--color-dark);
}

.sku-tag {
  display: inline-block;
  font-size: 0.725rem;
  color: var(--color-muted);
  font-family: monospace;
}

.product-desc {
  font-size: 0.775rem;
  color: var(--color-muted);
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.15rem;
}

.type-label {
  font-size: 0.8rem;
  color: var(--color-muted);
  margin-top: 0.2rem;
}

.producer-name {
  font-weight: 500;
}

.flavor-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.flavor-pill {
  background-color: #faf6f3;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xs);
  padding: 0.1rem 0.4rem;
  font-size: 0.725rem;
  color: var(--color-dark);
}

.currency-amount {
  font-weight: 600;
}
</style>
