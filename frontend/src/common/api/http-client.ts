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

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Error de conexión';
    console.error('[API Error]:', message);
    return Promise.reject(error);
  }
);
