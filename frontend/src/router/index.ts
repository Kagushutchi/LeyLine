import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/common/store/auth.store';
import DashboardView from '../views/DashboardView.vue';
import SuscriptoresView from '../modules/suscriptores/views/SuscriptoresView.vue';
import SuscripcionesView from '../modules/suscripciones/views/SuscripcionesView.vue';
import CajasMensualesView from '../modules/cajas-mensuales/views/CajasMensualesView.vue';
import ProductosView from '../modules/productos/views/ProductosView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import CatalogoView from '../views/CatalogoView.vue';

// Augmentar RouteMeta para TypeScript
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresGuest?: boolean;
    roles?: ('admin' | 'subscriptor')[];
  }
}

const routes: RouteRecordRaw[] = [
  // ── Rutas públicas (solo para no autenticados) ──────────────────────────────
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresGuest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterView,
    meta: { requiresGuest: true },
  },

  // ── Rutas de Admin (Bodega) ─────────────────────────────────────────────────
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
    meta: { requiresAuth: true, roles: ['admin'] },
  },
  {
    path: '/suscriptores',
    name: 'Suscriptores',
    component: SuscriptoresView,
    meta: { requiresAuth: true, roles: ['admin'] },
  },
  {
    path: '/suscripciones',
    name: 'Suscripciones',
    component: SuscripcionesView,
    meta: { requiresAuth: true, roles: ['admin'] },
  },
  {
    path: '/cajas-mensuales',
    name: 'CajasMensuales',
    component: CajasMensualesView,
    meta: { requiresAuth: true, roles: ['admin'] },
  },
  {
    path: '/productos',
    name: 'Productos',
    component: ProductosView,
    meta: { requiresAuth: true, roles: ['admin'] },
  },

  // ── Rutas de Subscriptor ────────────────────────────────────────────────────
  {
    path: '/catalogo',
    name: 'Catalogo',
    component: CatalogoView,
    meta: { requiresAuth: true, roles: ['subscriptor'] },
  },

  // ── Ruta catch-all ──────────────────────────────────────────────────────────
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

// ── Navigation Guard Global ───────────────────────────────────────────────────
// NOTA: useAuthStore() se llama dentro del guard (no en el scope del módulo)
// para garantizar que Pinia ya esté instalado cuando se accede al store.
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  const isAuthenticated = authStore.isAuthenticated;
  const userRole = authStore.user?.role as 'admin' | 'subscriptor' | undefined;

  // Ruta solo para guests (login, register): si ya está autenticado, redirigir
  if (to.meta.requiresGuest && isAuthenticated) {
    return next(userRole === 'admin' ? '/' : '/catalogo');
  }

  // Ruta protegida: si no está autenticado, redirigir a login
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ path: '/login', query: { redirect: to.fullPath } });
  }

  // Ruta con roles específicos: verificar que el usuario tenga el rol correcto
  if (to.meta.requiresAuth && to.meta.roles && userRole) {
    const allowedRoles = to.meta.roles;
    if (!allowedRoles.includes(userRole)) {
      return next(userRole === 'admin' ? '/' : '/catalogo');
    }
  }

  next();
});
