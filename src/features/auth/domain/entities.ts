import type { Principal, Workspace } from '@/shared/domain'
import type { ApiLanguageCode } from '@/features/i18n'

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

/** Step 1 of password+OTP registration (`POST /identity/register/start`). */
export interface RegisterStartInput {
  /** The email that receives the OTP. */
  readonly email: string
  /** The phone number stored with the registration; it is not verified by OTP. */
  readonly phone: string
  /** Canonical API language code for the OTP delivery (`uz`, `uz-Cyrl`, `ru`, `en`). */
  readonly otpLocale: string
  /**
   * The account's initial interface language, stored with the registration
   * (`register/start.language_code`), in the canonical backend form. Optional
   * and nullable: the field is omitted when the UI has no supported language
   * to send.
   */
  readonly languageCode?: ApiLanguageCode | null
}

/** The pending registration returned by `register/start`. */
export interface RegisterPending {
  /** Opaque id the completion step must present. */
  readonly pendingId: string
  /** OTP validity in seconds. */
  readonly expiresInSec: number
  /** Cooldown before the same registration may be restarted, in seconds. */
  readonly resendAfterSec: number
}

/** Step 2 of password+OTP registration (`POST /identity/register/complete`). */
export interface RegisterCompleteInput {
  readonly pendingId: string
  readonly code: string
  readonly password: string
  readonly fullName: string
  /** Canonical API language code for the OTP delivery (`uz`, `uz-Cyrl`, `ru`, `en`). */
  readonly otpLocale: string
}

/**
 * The tenant the caller picked in the switch dialog
 * (`POST /identity/switch-tenant`). A personal tenant is just another tenant id;
 * the dialog renders the list `/identity/me` returns.
 */
export interface WorkspaceChoice {
  readonly tenantId: string
}

/** Result of linking an E-IMZO key to the signed-in account. */
export interface EimzoLinkResult {
  readonly linked: boolean
  /** The masked PINFL the backend echoes back, for display only. */
  readonly pinflMasked: string
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
