import axios from 'axios';

/**
 * Cliente HTTP base para comunicación con el backend Express
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Adjunta el access token (si existe) a cada request. Se lee directo de
// localStorage en vez de importar el store de auth para evitar un ciclo de
// imports (el store de auth ya depende de este cliente).
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('cc_access_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  const currentRefresh = localStorage.getItem('cc_refresh_token');
  if (!currentRefresh) {
    return null;
  }

  try {
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/refresh`,
      { refreshToken: currentRefresh }
    );
    const { accessToken, refreshToken } = response.data.data;
    localStorage.setItem('cc_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('cc_refresh_token', refreshToken);
    }
    return accessToken;
  } catch {
    return null;
  }
};

const clearSession = () => {
  localStorage.removeItem('cc_access_token');
  localStorage.removeItem('cc_refresh_token');
  localStorage.removeItem('cc_user');
};

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Si el access token venció (401) y todavía no reintentamos este request,
    // intentamos renovarlo una sola vez con el refresh token antes de rendirnos.
    if (
      error.response?.status === 401 &&
      !originalRequest?._retried &&
      !originalRequest?.url?.includes('/auth/')
    ) {
      originalRequest._retried = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;

      if (newToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      clearSession();
    }

    const message = error.response?.data?.message || error.message || 'Error de conexión';
    console.error('[API Error]:', message);
    return Promise.reject(error);
  }
);
