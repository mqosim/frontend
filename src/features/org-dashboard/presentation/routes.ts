import type { RouteRecordRaw } from 'vue-router'

import { findModule, firstModuleId } from '../application/menu'

const moduleParam = (params: Record<string, unknown>): string => {
  const value = params.module
  return typeof value === 'string' ? value : ''
}

/**
 * Routes for the ORG context. The shell (module menu + sub-panel + content) is
 * the `org` layout, so these records only describe the content pages.
 * `workspace: 'org'` admits both a real ORG account and a PERSON who selected an
 * organization; a personal-workspace session is redirected to its own area by the
 * shared guard.
 */
export const orgRoutes: RouteRecordRaw[] = [
  {
    // `/org` opens the first module.
    path: '/org',
    name: 'org',
    redirect: () => ({ name: 'org-module', params: { module: firstModuleId() } }),
    meta: {
      layout: 'org',
      requiresAuth: true,
      workspace: 'org',
      translationPages: ['org'],
    },
  },
  {
    path: '/org/:module',
    name: 'org-module',
    component: () => import('./views/OrgModulePage.vue'),
    props: (route) => ({ moduleId: moduleParam(route.params) }),
    meta: {
      layout: 'org',
      requiresAuth: true,
      workspace: 'org',
      translationPages: ['org'],
    },
    // Unknown slugs go back to the default module instead of rendering empty.
    beforeEnter: (to) => (findModule(moduleParam(to.params)) === null ? { name: 'org' } : true),
  },
]
