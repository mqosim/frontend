import type { Principal, Workspace } from '@/shared/domain'

/** Route names a completed regular session may land on. */
export type RegularDashboardRoute = 'app-home' | 'org'

/**
 * The one place that decides which workspace a principal is in. A real ORG
 * account and a PERSON that selected an organization both run inside the org
 * workspace; a PERSON with no organization (and the anonymous state) is personal.
 * Route guards, menus and redirects all read this instead of testing
 * `principalType === 'ORG'` in scattered places.
 */
export const workspaceOf = (principal: Principal | null): Workspace => {
  if (principal === null) return 'personal'
  if (principal.type === 'ORG') return 'org'
  if (principal.type === 'PERSON' && principal.orgId !== null) return 'org'
  return 'personal'
}

/**
 * The one place that decides where a signed-in regular user goes: a principal in
 * the org workspace gets the org module shell, everyone else keeps the personal
 * home. Used by the post-login handler, the guard's guest redirects and the guest
 * "Dashboard" links so the target can never drift between them.
 */
export const regularDashboardRoute = (principal: Principal | null): RegularDashboardRoute =>
  workspaceOf(principal) === 'org' ? 'org' : 'app-home'
