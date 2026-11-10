import type { Principal, Workspace } from '@/shared/domain'

/**
 * One tenant the person may switch into, as returned by
 * `GET /api/v1/identity/me`. `personal` is the person's own tenant; `org` is an
 * organization membership.
 */
export interface WorkspaceOption {
  readonly id: string
  readonly name: string
  readonly type: 'personal' | 'org'
  /**
   * The organization's TIN. The current contract does not expose it on a tenant
   * membership, so this is always empty and the UI hides the field.
   */
  readonly tin: string
}

/** The tenant the session is currently scoped to. */
export interface WorkspaceState {
  readonly workspace: Workspace
  /** The active tenant's uuid (`/identity/me.tenant.id`). */
  readonly tenantId: string
  /** The active org tenant's uuid, or `null` for the personal tenant. */
  readonly orgId: string | null
}

/** The person's switchable tenants plus the current one. */
export interface WorkspaceList {
  readonly options: readonly WorkspaceOption[]
  readonly current: WorkspaceState
}

export interface LoginInput {
  /** Email or phone number; the backend accepts either in one field. */
  readonly identifier: string
  readonly password: string
}

/**
 * The tenant the caller picked in the switch dialog
 * (`POST /identity/switch-tenant`). A personal tenant is just another tenant id;
 * the dialog renders the list `/identity/me` returns.
 */
export interface WorkspaceChoice {
  readonly tenantId: string
}

/**
 * One signable key reported by the local E-IMZO client. `id` is an opaque
 * handle the infrastructure adapter maps back to its E-IMZO key object; the
 * other fields are display-only.
 *
 * E-IMZO sign-in/registration is not part of the current migration step; the
 * local adapter types are kept so that code is preserved in git history.
 */
export interface EimzoKey {
  readonly id: string
  /** Certificate subject (owner) as shown to the user. */
  readonly subject: string
  readonly serialNumber: string
  /** ISO-8601 strings, or `null` when E-IMZO did not provide a parseable date. */
  readonly validFrom: string | null
  readonly validTo: string | null
}

/**
 * Outcome of password login, refresh and tenant switch. Every one of them
 * produces a complete session: the new contract has no pending-workspace step.
 */
export type AuthOutcome = {
  readonly kind: 'authenticated'
  readonly principal: Principal
}
