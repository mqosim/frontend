import { useRouter } from 'vue-router'

import { regularDashboardRoute } from '@/shared/presentation/navigation/dashboardRoute'

import type { AuthOutcome } from '../../domain/entities'
import { useAuthSessionStore } from '../stores/sessionStore'

export interface AuthOutcomeNavigation {
  /** Applies a successful auth outcome: session state plus the right redirect. */
  applyOutcome(outcome: AuthOutcome): void
}

/**
 * Shared success handling for every sign-in panel. The new contract has no
 * pending-workspace step: every outcome is a complete session, so it is stored
 * and the user lands on the area its tenant owns.
 */
export const useAuthOutcome = (): AuthOutcomeNavigation => {
  const router = useRouter()
  const session = useAuthSessionStore()

  const applyOutcome = (outcome: AuthOutcome): void => {
    session.setAuthenticated(outcome.principal)
    void router.push({ name: regularDashboardRoute(outcome.principal) })
  }

  return { applyOutcome }
}
