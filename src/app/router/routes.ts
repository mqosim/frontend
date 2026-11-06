import type { RouteRecordRaw } from 'vue-router'

import { authRoutes } from '@/features/auth'
import { homeRoutes } from '@/features/home'
import { orgRoutes } from '@/features/org-dashboard'
import { settingsRoutes } from '@/features/settings'
import { systemAdminRoutes } from '@/features/system-admin'
import { systemAuthRoutes } from '@/features/system-auth'

/**
 * The app's route table. Feature route records are contributed through each
 * feature's public entry point; the composition root only assembles them.
 */
export const routes: RouteRecordRaw[] = [
  ...homeRoutes,
  ...authRoutes,
  ...systemAuthRoutes,
  ...systemAdminRoutes,
  ...orgRoutes,
  ...settingsRoutes,
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundPage.vue'),
    meta: {
      layout: 'public',
      // PublicLayout renders `nav.*` links, whose keys live on the `home` slug.
      translationPages: ['errors', 'home'],
    },
  },
]
