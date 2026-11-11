import type { RouteRecordRaw } from 'vue-router'

import { findSystemModule } from '../application/menu'

const moduleParam = (params: Record<string, unknown>): string => {
  const value = params.module
  return typeof value === 'string' ? value : ''
}

/**
 * Routes for the authenticated SYSTEM area. `principals: ['SYSTEM']` keeps a
 * PERSON/ORG session out, and the SYSTEM guard only ever authenticates via the
 * system store. The login route stays on the system-auth feature; `/system`
 * redirects to the dashboard so the bare prefix stays valid. Static segments
 * outrank the module parameter, so `/system/login` always wins over
 * `/system/:module`.
 */
export const systemAdminRoutes: RouteRecordRaw[] = [
  // ── Organizations ────────────────────────────────────────────────────────
  {
    path: '/system/organizations',
    name: 'system-organizations',
    component: () => import('./views/SystemOrganizationsPage.vue'),
    meta: {
      layout: 'system',
      requiresAuth: true,
      principals: ['SYSTEM'],
      translationPages: ['system.admin'],
      systemModule: 'organizations',
    },
  },
  {
    path: '/system/organizations/:tenantId',
    name: 'system-organization-detail',
    component: () => import('./views/SystemOrganizationDetailPage.vue'),
    props: (route) => ({ tenantId: String(route.params.tenantId ?? '') }),
    meta: {
      layout: 'system',
      requiresAuth: true,
      principals: ['SYSTEM'],
      translationPages: ['system.admin'],
      systemModule: 'organizations',
    },
  },
  // ── Staff (system users) ─────────────────────────────────────────────────
  {
    path: '/system/system-users',
    name: 'system-system-users',
    component: () => import('./views/SystemSystemUsersPage.vue'),
    meta: {
      layout: 'system',
      requiresAuth: true,
      principals: ['SYSTEM'],
      translationPages: ['system.admin'],
      systemModule: 'system-users',
    },
  },
  {
    path: '/system/system-users/:userId',
    name: 'system-system-user-detail',
    component: () => import('./views/SystemSystemUserDetailPage.vue'),
    props: (route) => ({ userId: String(route.params.userId ?? '') }),
    meta: {
      layout: 'system',
      requiresAuth: true,
      principals: ['SYSTEM'],
      translationPages: ['system.admin'],
      systemModule: 'system-users',
    },
  },
  {
    path: '/system/dashboard',
    name: 'system-dashboard',
    component: () => import('./components/SystemDashboardPage.vue'),
    meta: {
      layout: 'system',
      requiresAuth: true,
      principals: ['SYSTEM'],
      translationPages: ['system.admin'],
    },
  },
  {
    path: '/system/settings',
    name: 'system-settings',
    component: () => import('./views/SystemSettingsPage.vue'),
    meta: {
      layout: 'system',
      requiresAuth: true,
      principals: ['SYSTEM'],
      // The Appearance section reuses the settings feature's phrase keys.
      translationPages: ['system.admin', 'settings'],
    },
  },
  {
    path: '/system/:module',
    name: 'system-module',
    component: () => import('./views/SystemModulePage.vue'),
    props: (route) => ({ moduleId: moduleParam(route.params) }),
    meta: {
      layout: 'system',
      requiresAuth: true,
      principals: ['SYSTEM'],
      translationPages: ['system.admin'],
    },
    // Unknown slugs go back to the dashboard instead of rendering empty.
    beforeEnter: (to) =>
      findSystemModule(moduleParam(to.params)) === null ? { name: 'system-dashboard' } : true,
  },
  // ── Backward-compatible alias ────────────────────────────────────────────
  { path: '/system', redirect: { name: 'system-dashboard' } },
]
