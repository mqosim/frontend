import type { RouteRecordRaw } from 'vue-router'

/**
 * The authenticated user's settings. One route serves every regular session and
 * every section: the optional `section` param addresses the sub-sections
 * (`/settings` → Account Security, `/settings/profile` → Profile,
 * `/settings/language` → Language) while the
 * route name stays `settings`, so the module menu's and the personal header's
 * Settings entries keep their active state untouched. The page is
 * chrome-agnostic: the shared authenticated layout picks the ORG shell or the
 * PERSON layout from the session's principal type; SYSTEM accounts never reach
 * this route (route principals).
 */
export const settingsRoutes: RouteRecordRaw[] = [
  {
    path: '/settings/:section?',
    name: 'settings',
    component: () => import('./views/UserSettingsPage.vue'),
    meta: {
      layout: 'settings',
      requiresAuth: true,
      principals: ['ORG', 'PERSON'],
      // `org` supplies the shell menu labels when Settings renders inside the ORG
      // shell; `settings` holds this page's own phrases; `errors` provides the
      // shared field-validation copy the account-security forms reuse.
      translationPages: ['settings', 'org', 'errors'],
    },
  },
]
