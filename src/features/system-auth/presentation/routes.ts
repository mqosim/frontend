import type { RouteRecordRaw } from 'vue-router'

/**
 * Routes for the SYSTEM context's authentication. The authenticated SYSTEM
 * area (dashboard, modules, settings) lives on the system-admin feature;
 * `principals` there keeps a PERSON/ORG session out and the SYSTEM guard only
 * ever authenticates via the system store.
 */
export const systemAuthRoutes: RouteRecordRaw[] = [
  {
    path: '/system/login',
    name: 'system-login',
    component: () => import('./views/SystemLoginPage.vue'),
    meta: {
      layout: 'auth',
      guestOnly: true,
      translationPages: ['system.login', 'errors'],
    },
  },
]
