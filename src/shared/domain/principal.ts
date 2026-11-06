/** The kind of principal an access token represents. */
export type PrincipalType = 'PERSON' | 'ORG' | 'SYSTEM'

/**
 * UI-only hints decoded from the access token. Neither the type nor the claims
 * are trusted for authorization: the server is the authority.
 */
export interface Principal {
  readonly type: PrincipalType
  readonly userId: string | null
  readonly orgId: string | null
  readonly needsWorkspace: boolean
  /** Epoch milliseconds, or `null` when the token carries no `exp`. */
  readonly expiresAt: number | null
}
