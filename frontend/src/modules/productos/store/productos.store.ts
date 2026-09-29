import { defineStore } from 'pinia';
import { ref } from 'vue';
import { productosService, ProductoDTO } from '../services/productos.service';

export const useProductosStore = defineStore('productos', () => {
  const productos = ref<ProductoDTO[]>([]);
  const selectedProducto = ref<ProductoDTO | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const fetchProductos = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await productosService.getAll();
      productos.value = Array.isArray(response.data) ? response.data : [];
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al cargar productos';
    } finally {
      loading.value = false;
    }
  };

  const getProductoById = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await productosService.getById(id);
      selectedProducto.value = response.data;
      return response.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al obtener producto';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createProducto = async (payload: Partial<ProductoDTO>) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await productosService.create(payload);
      if (response.data) {
        productos.value.unshift(response.data);
      }
      return response.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al crear producto';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateProducto = async (id: string, payload: Partial<ProductoDTO>) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await productosService.update(id, payload);
      const index = productos.value.findIndex((p) => p.id === id);
      if (index !== -1 && response.data) {
        productos.value[index] = { ...productos.value[index], ...response.data };
      }
      return response.data;
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al actualizar producto';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteProducto = async (id: string) => {
    loading.value = true;
    error.value = null;
    try {
      await productosService.delete(id);
      productos.value = productos.value.filter((p) => p.id !== id);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      error.value = e.response?.data?.message || e.message || 'Error al eliminar producto';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    productos,
    selectedProducto,
    loading,
    error,
    fetchProductos,
    getProductoById,
    createProducto,
    updateProducto,
    deleteProducto,
  };
});
