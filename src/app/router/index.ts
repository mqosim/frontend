import { createRouter, createWebHistory } from 'vue-router'

import './meta'
import { createAuthGuard } from './guards'
import type { GuardDeps } from './guards'
import { routes } from './routes'

export const createAppRouter = (deps: GuardDeps) => {
  const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior: () => ({ top: 0 }),
  })

  router.beforeEach(createAuthGuard(deps))
  return router
}
