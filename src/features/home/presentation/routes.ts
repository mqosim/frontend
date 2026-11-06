import type { RouteRecordRaw } from 'vue-router'

/**
 * The public landing page. The guard resolves an existing regular session for
 * every route, so the header can offer a Dashboard link instead of the guest
 * links — no other auth behaviour is involved. The `org` slug supplies the
 * module names reused by the landing's product overview.
 */
export const homeRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'landing',
    component: () => import('./views/LandingPage.vue'),
    meta: {
      layout: 'landing',
      translationPages: ['home', 'org'],
    },
  },
]
