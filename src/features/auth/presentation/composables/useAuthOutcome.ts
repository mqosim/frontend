import { useRouter } from 'vue-router'

import { regularDashboardRoute } from '@/shared/presentation/navigation/dashboardRoute'

import type { AuthOutcome } from '../../domain/entities'
import { useAuthSessionStore } from '../stores/sessionStore'

export interface AuthOutcomeNavigation {
  /** Applies a successful auth outcome: session state plus the right redirect. */
  applyOutcome(outcome: AuthOutcome): void
}

/** Shared success handling for every sign-in panel and the register view. */
export const useAuthOutcome = (): AuthOutcomeNavigation => {
  const router = useRouter()
  const session = useAuthSessionStore()

  const applyOutcome = (outcome: AuthOutcome): void => {
    if (outcome.kind === 'workspace_required') {
      session.setWorkspaceRequired(outcome.principal, outcome.workspaces)
      void router.push({ name: 'workspaces' })
      return
    }
    session.setAuthenticated(outcome.principal)
    void router.push({ name: regularDashboardRoute(outcome.principal) })
  }

  return { applyOutcome }
}
