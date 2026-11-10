import { err } from '@/shared/domain'
import type { Result } from '@/shared/domain'

import type { WorkspaceList } from '../../domain/entities'
import type { AuthUseCases } from '../../application/useCases'
import { useAuthSessionStore } from './sessionStore'

/**
 * Loads the person's switchable tenants into the session store so the shell can
 * show a readable workspace label and the switch dialog can list the options from
 * the same data.
 *
 * Any authenticated regular session may call this: a PERSON who switched into an
 * organization still owns the other tenant memberships and must be able to switch
 * back. Only an unauthenticated store gets a `Forbidden` result and no fetch.
 * Failures are returned (never thrown) so the caller can fall back to a generic
 * label; the label stays generic and the dialog retries on open.
 */
export const loadAccountWorkspaces = async (auth: AuthUseCases): Promise<Result<WorkspaceList>> => {
  const session = useAuthSessionStore()
  if (session.status !== 'authenticated') {
    return err({ kind: 'Forbidden', status: 403 })
  }

  const result = await auth.listWorkspaces()
  if (result.ok) session.setAccountWorkspaces(result.value.options, result.value.current)
  return result
}
