import type { Principal, Workspace } from '@/shared/domain'

/** An organisation a PERSON may switch into. */
export interface WorkspaceOption {
  readonly id: string
  readonly name: string
  readonly tin: string
}

/** The workspace a token is currently scoped to (`GET /auth/workspaces`). */
export interface WorkspaceState {
  readonly workspace: Workspace
  /** The active org's uuid, or `null` (personal, or an org that was deactivated). */
  readonly orgId: string | null
}

/** The PERSON's switchable organizations plus the current workspace. */
export interface WorkspaceList {
  readonly options: readonly WorkspaceOption[]
  readonly current: WorkspaceState
}

export interface LoginInput {
  /** Exactly one of `email` / `phoneNumber` must be present. */
  readonly email?: string
  readonly phoneNumber?: string
  readonly password: string
}

/**
 * One signable key reported by the local E-IMZO client. `id` is an opaque
 * handle the infrastructure adapter maps back to its E-IMZO key object; the
 * other fields are display-only.
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

export interface RegisterInput {
  readonly email: string
  readonly phoneNumber: string
  readonly password: string
  /** Optional; the backend falls back to its default language. */
  readonly languageCode?: string
}

/** The workspace the caller picked after a pending-workspace login. */
export type WorkspaceChoice =
  { readonly kind: 'personal' } | { readonly kind: 'org'; readonly orgId: string }

/** Payload for rotating the caller's own password (`POST /auth/me/password`). */
export interface ChangePasswordInput {
  readonly currentPassword: string
  readonly newPassword: string
}

/** Payload for starting an email change (`POST /auth/me/email/change`). */
export interface ChangeEmailInput {
  readonly newEmail: string
  readonly currentPassword: string
}

/**
 * Confirms a started email change has a code delivered to the NEW address;
 * the API contract fixes it to 6 digits, so the UI validates the shape too.
 */
export interface ConfirmEmailChangeInput {
  readonly code: string
}

/** The 202 body of the email-change request: both values are seconds. */
export interface EmailChangePending {
  /** How long the verification code stays valid. */
  readonly expiresInSec: number
  /** How long until the same request may be repeated (resend cooldown). */
  readonly resendAfterSec: number
}

/**
 * Outcome of register / login / select_workspace. A `workspace_required` result
 * carries a pending token with no refresh cookie: it must be completed through
 * `selectWorkspace`, and a reload before that returns the user to login.
 */
export type AuthOutcome =
  | { readonly kind: 'authenticated'; readonly principal: Principal }
  | {
      readonly kind: 'workspace_required'
      readonly principal: Principal
      readonly workspaces: readonly WorkspaceOption[]
    }
