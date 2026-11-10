import type { RouteRecordRaw } from 'vue-router'

/**
 * Routes for the regular (PERSON/ORG) context. Every route declares the
 * translation pages it needs; `common` is always added by the guard.
 *
 * `/dashboard` and `/workspace` are kept as redirects to their renamed targets
 * so existing links and bookmarks keep working. The redirect resolves during
 * matching, so the guard still runs against the final, fully-guarded route — no
 * authentication or principal check is bypassed.
 */
export const authRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('./views/LoginPage.vue'),
    meta: {
      layout: 'auth',
      guestOnly: true,
      // `auth.register` is needed for the "Create your account" link, whose key
      // (`auth.register_title`) lives on the register page slug.
      translationPages: ['auth.login', 'auth.register', 'errors'],
    },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('./views/RegisterPage.vue'),
    meta: {
      layout: 'auth',
      guestOnly: true,
      translationPages: ['auth.register', 'auth.login', 'errors'],
    },
  },
  {
    path: '/app/home',
    name: 'app-home',
    // The personal workspace shares the org application shell; the page lives
    // with the other dashboard code and is exported from the feature barrel.
    component: () => import('@/features/org-dashboard').then((m) => m.PersonalDashboardPage),
    meta: {
      layout: 'person',
      requiresAuth: true,
      workspace: 'personal',
      // `dashboard` carries the page's own phrases; `org` and `settings` provide
      // the shared shell's menu and header labels (module menu, search field).
      translationPages: ['dashboard', 'org', 'settings'],
    },
  },
  // ── Backward-compatible aliases ──────────────────────────────────────────
  { path: '/dashboard', redirect: { name: 'app-home' } },
  // The old pending-workspace step no longer exists; the tenant is chosen inside
  // the app, so an old bookmark lands on the dashboard (the guard sends an
  // anonymous visitor to login).
  { path: '/workspace', redirect: { name: 'app-home' } },
]
