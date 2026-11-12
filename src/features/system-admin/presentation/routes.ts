import type { RouteRecordRaw } from 'vue-router'

import { ADMIN_PERMISSIONS } from '../domain/permissions'

/**
 * Routes for the authenticated SYSTEM area. `principals: ['SYSTEM']` keeps a
 * PERSON/ORG session out, and the SYSTEM guard only ever authenticates via the
 * system store. `systemPermission` is the exact backend grant the page needs;
 * the guard resolves it before rendering and sends unauthorized direct visits
 * to the in-shell access-denied view. The login route stays on the system-auth
 * feature; `/system` redirects to the dashboard so the bare prefix stays valid.
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
      systemPermission: ADMIN_PERMISSIONS.tenantsRead,
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
      systemPermission: ADMIN_PERMISSIONS.tenantsRead,
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
      systemPermission: ADMIN_PERMISSIONS.systemUsersRead,
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
      systemPermission: ADMIN_PERMISSIONS.systemUsersRead,
    },
  },
  // ── i18n catalog management ──────────────────────────────────────────────
  {
    path: '/system/i18n',
    name: 'system-i18n',
    component: () => import('./views/SystemI18nPage.vue'),
    meta: {
      layout: 'system',
      requiresAuth: true,
      principals: ['SYSTEM'],
      translationPages: ['system.admin'],
      systemModule: 'i18n',
      systemPermission: ADMIN_PERMISSIONS.i18nRead,
    },
  },
  // ── Audit chain ──────────────────────────────────────────────────────────
  {
    path: '/system/audit',
    name: 'system-audit',
    component: () => import('./components/SystemAuditLogsPage.vue'),
    meta: {
      layout: 'system',
      requiresAuth: true,
      principals: ['SYSTEM'],
      translationPages: ['system.admin'],
      systemModule: 'audit',
      systemPermission: ADMIN_PERMISSIONS.auditRead,
    },
  },
  // ── Neutral landing and own-account settings ─────────────────────────────
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
  // ── Access denied ────────────────────────────────────────────────────────
  {
    path: '/system/access-denied',
    name: 'system-access-denied',
    component: () => import('./views/SystemAccessDeniedPage.vue'),
    meta: {
      layout: 'system',
      requiresAuth: true,
      principals: ['SYSTEM'],
      translationPages: ['system.admin'],
    },
  },
  // ── Legacy module slugs ──────────────────────────────────────────────────
  // The former `/system/<module>` pages are either dedicated routes now or no
  // longer exist (unbacked placeholders); keep the prefix meaningful instead of
  // rendering an empty page.
  {
    path: '/system/:module',
    name: 'system-module',
    redirect: { name: 'system-dashboard' },
  },
  { path: '/system', redirect: { name: 'system-dashboard' } },
]
