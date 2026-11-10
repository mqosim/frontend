/**
 * The caller's own account row, as returned by `GET /api/v1/identity/me`.
 * Narrowed to the fields the UI needs. The current backend exposes only masked
 * contact details there, so `email`/`phoneNumber` are display values, not
 * editable addresses.
 *
 * `languageCode` is `null` for the regular context: the new contract does not
 * return an account language from `/identity/me` (it lives in notification
 * preferences, which are not migrated yet), so the router guard's language
 * adoption is a no-op until then. `emailVerifiedAt` is likewise `null` — there
 * is no email-change flow in the current contract.
 */
export interface UserProfile {
  readonly uuid: string
  /**
   * The account's display name (`/identity/me.full_name`). Optional because the
   * SYSTEM realm's profile endpoint does not expose a name yet; the regular
   * context always receives it.
   */
  readonly fullName?: string | null
  readonly email: string | null
  readonly phoneNumber: string | null
  readonly languageCode: string | null
  readonly emailVerifiedAt: string | null
}
