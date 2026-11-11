import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiClient } from '../api/http-client';
import { useToastStore } from './toast.store';

export type UserRole = 'admin' | 'subscriptor';

export interface TenantInfo {
  id: string;
  nombre: string;
  slug: string;
  plan?: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  nombre?: string;
  apellido?: string;
  tenantId?: string;
  suscriptorId?: string | null;
  tenant?: TenantInfo | null;
}

export interface RegisterAdminPayload {
  nombreNegocio: string;
  email: string;
  password: string;
  username: string;
}

export interface RegisterSubscriptorPayload {
  email: string;
  username: string;
  nombre: string;
  apellido: string;
  password: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

/**
 * Store de autenticación y multi-tenancy. Persiste la sesión en localStorage
 * para que el cliente HTTP (ver common/api/http-client.ts) pueda adjuntar el
 * token sin depender de que Pinia ya esté inicializado.
 */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const loading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isSubscriptor = computed(() => user.value?.role === 'subscriptor');
  const tenantName = computed(() => user.value?.tenant?.nombre || null);
  const displayName = computed(() => {
    if (!user.value) return '';
    if (user.value.nombre && user.value.apellido) {
      return `${user.value.nombre} ${user.value.apellido}`;
    }
    if (user.value.nombre) return user.value.nombre;
    return user.value.username;
  });

  const setAuthData = (data: { user: UserInfo; accessToken: string; refreshToken: string }) => {
    user.value = data.user;
    accessToken.value = data.accessToken;
    refreshToken.value = data.refreshToken;

    localStorage.setItem('cc_access_token', data.accessToken);
    localStorage.setItem('cc_refresh_token', data.refreshToken);
    localStorage.setItem('cc_user', JSON.stringify(data.user));
  };

  const clearAuthData = () => {
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    error.value = null;

    localStorage.removeItem('cc_access_token');
    localStorage.removeItem('cc_refresh_token');
    localStorage.removeItem('cc_user');
  };

  const initAuth = () => {
    const savedAccess = localStorage.getItem('cc_access_token');
    const savedRefresh = localStorage.getItem('cc_refresh_token');
    const savedUser = localStorage.getItem('cc_user');

    if (savedAccess && savedRefresh && savedUser) {
      try {
        accessToken.value = savedAccess;
        refreshToken.value = savedRefresh;
        user.value = JSON.parse(savedUser);
      } catch {
        clearAuthData();
      }
    }
  };

  // Hidratar inmediatamente al inicializar el store.
  initAuth();

  const login = async (payload: LoginPayload) => {
    loading.value = true;
    error.value = null;
    const toast = useToastStore();
    try {
      const response: any = await apiClient.post('/auth/login', payload);
      setAuthData(response.data);
      toast.success(
        `Bienvenido, ${displayName.value} (${isAdmin.value ? 'Admin' : 'Subscriptor'})`,
        'Acceso concedido'
      );
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al iniciar sesión';
      error.value = msg;
      toast.error(msg);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const registerAdmin = async (payload: RegisterAdminPayload) => {
    loading.value = true;
    error.value = null;
    const toast = useToastStore();
    try {
      const response: any = await apiClient.post('/auth/register-admin', payload);
      setAuthData(response.data);
      toast.success(
        `Bodega '${payload.nombreNegocio}' registrada con éxito. ¡Bienvenido Administrador!`,
        'Registro exitoso'
      );
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al registrar bodega';
      error.value = msg;
      toast.error(msg);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const registerSubscriptor = async (payload: RegisterSubscriptorPayload) => {
    loading.value = true;
    error.value = null;
    const toast = useToastStore();
    try {
      const response: any = await apiClient.post('/auth/register-subscriptor', payload);
      setAuthData(response.data);
      toast.success(`Membresía registrada con éxito. ¡Bienvenido, ${payload.nombre}!`, 'Registro exitoso');
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al registrar subscriptor';
      error.value = msg;
      toast.error(msg);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const refreshAccessToken = async (): Promise<string | null> => {
    const currentRefresh = refreshToken.value || localStorage.getItem('cc_refresh_token');
    if (!currentRefresh) {
      clearAuthData();
      return null;
    }

    try {
      const response: any = await apiClient.post('/auth/refresh', {
        refreshToken: currentRefresh,
      });
      const newTokens = response.data;
      accessToken.value = newTokens.accessToken;
      if (newTokens.refreshToken) {
        refreshToken.value = newTokens.refreshToken;
        localStorage.setItem('cc_refresh_token', newTokens.refreshToken);
      }
      localStorage.setItem('cc_access_token', newTokens.accessToken);
      return newTokens.accessToken;
    } catch {
      clearAuthData();
      return null;
    }
  };

  const logout = async () => {
    try {
      if (accessToken.value) {
        await apiClient.post('/auth/logout');
      }
    } catch {
      // Ignoramos error en logout: igual limpiamos la sesión local.
    } finally {
      clearAuthData();
      const toast = useToastStore();
      toast.info('Sesión cerrada correctamente', 'Hasta pronto');
    }
  };

  return {
    user,
    accessToken,
    refreshToken,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    isSubscriptor,
    tenantName,
    displayName,
    initAuth,
    login,
    registerAdmin,
    registerSubscriptor,
    refreshAccessToken,
    logout,
  };
});
