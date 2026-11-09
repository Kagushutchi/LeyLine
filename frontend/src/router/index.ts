import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import SuscriptoresView from '../modules/suscriptores/views/SuscriptoresView.vue';
import SuscripcionesView from '../modules/suscripciones/views/SuscripcionesView.vue';
import CajasMensualesView from '../modules/cajas-mensuales/views/CajasMensualesView.vue';
import ProductosView from '../modules/productos/views/ProductosView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
  },
  {
    path: '/register',
    name: 'Register',
    component: RegisterView,
  },
  {
    path: '/suscriptores',
    name: 'Suscriptores',
    component: SuscriptoresView,
  },
  {
    path: '/suscripciones',
    name: 'Suscripciones',
    component: SuscripcionesView,
  },
  {
    path: '/cajas-mensuales',
    name: 'CajasMensuales',
    component: CajasMensualesView,
  },
  {
    path: '/productos',
    name: 'Productos',
    component: ProductosView,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
