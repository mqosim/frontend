/**
 * The caller's own account row, as returned by `GET /auth/me`. Narrowed to the
 * non-sensitive fields the UI needs. `languageCode` is the account's persisted
 * language and the ONLY source of a signed-in user's preferred language — it is
 * never read from the access token.
 *
 * `emailVerifiedAt` is set only after the email-change flow was confirmed with
 * the verification code; `null` for accounts that never completed it, so the UI
 * must not treat the address as verified on its own.
 */
export interface UserProfile {
  readonly uuid: string
  readonly email: string | null
  readonly phoneNumber: string | null
  readonly languageCode: string | null
  readonly emailVerifiedAt: string | null
}
