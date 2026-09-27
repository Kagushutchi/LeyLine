import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import SuscriptoresView from '../modules/suscriptores/views/SuscriptoresView.vue';
import SuscripcionesView from '../modules/suscripciones/views/SuscripcionesView.vue';
import CajasMensualesView from '../modules/cajas-mensuales/views/CajasMensualesView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView,
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
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
