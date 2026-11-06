import { err } from '@/shared/domain'
import type { Result } from '@/shared/domain'

import type { WorkspaceList } from '../../domain/entities'
import type { AuthUseCases } from '../../application/useCases'
import { useAuthSessionStore } from './sessionStore'

/**
 * Loads the PERSON's switchable workspaces into the session store so the org
 * shell can show a readable account label and the switch dialog can list the
 * options from the same cached data.
 *
 * Only a PERSON with a selected workspace may call this (never ORG, SYSTEM or the
 * pending-workspace state): those get a `Forbidden` result and no fetch. Failures
 * are returned (never thrown) so the caller can fall back to a generic label; the
 * label simply stays generic and the dialog retries on open.
 */
export const loadAccountWorkspaces = async (auth: AuthUseCases): Promise<Result<WorkspaceList>> => {
  const session = useAuthSessionStore()
  if (session.status !== 'authenticated' || session.principal?.type !== 'PERSON') {
    return err({ kind: 'Forbidden', status: 403 })
  }

  const result = await auth.listWorkspaces()
  if (result.ok) session.setAccountWorkspaces(result.value.options, result.value.current)
  return result
}
