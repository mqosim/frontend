import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAuthSessionStore } from '../stores/sessionStore'

/**
 * A readable label for the session's current workspace, for the org shell account
 * area and the PERSON home. It prefers the organization name (then its TIN) from
 * the loaded workspace list, and never shows the raw `oid`. Before the list loads
 * (and when the name is unavailable) it falls back to a generic i18n label.
 */
export const useWorkspaceLabel = (): ComputedRef<string> => {
  const { t } = useI18n()
  const session = useAuthSessionStore()

  return computed<string>(() => {
    const current = session.currentWorkspace
    if (current === null) {
      // The workspace list is not loaded yet: use only the token hint, never the id.
      return session.principal?.orgId != null ? t('workspace.unknown') : t('workspace.personal')
    }
    if (current.workspace === 'personal') return t('workspace.personal')

    const org = session.accountWorkspaces.find((option) => option.id === current.orgId)
    const name = org?.name.trim()
    if (name !== undefined && name.length > 0) return name
    const tin = org?.tin.trim()
    if (tin !== undefined && tin.length > 0) return tin
    // Active org not in the list (deactivated) or the list failed to load.
    return t('workspace.unknown')
  })
}
