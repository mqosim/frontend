/**
 * The SYSTEM caller's own admin identity and resolved grants, as served by
 * `GET /api/v1/system/auth/me`. The backend grants exactly one role (enforced
 * by a DB CHECK), wrapped as a one-element list for the UI. Permissions are
 * resolved server-side on every request; the UI only uses them to decide what
 * to show (the backend remains the authority and enforces every call).
 */
export interface AdminIdentity {
  readonly uuid: string
  readonly email: string | null
  readonly roles: readonly string[]
  readonly permissions: readonly string[]
}
