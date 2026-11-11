/** Claims the backend puts in an access token (see the Auth service). */
export interface AccessTokenClaims {
  /** Token kind, e.g. `access_token`. */
  readonly type?: string
  /** Principal kind: `PERSON`, `ORG` or `SYSTEM`. */
  readonly ptype?: string
  readonly uid?: string
  readonly pid?: string
  readonly oid?: string
  readonly needs_ws?: boolean
  readonly sub?: string
  /** Expiry, seconds since epoch. */
  readonly exp?: number
  readonly jti?: string
  /**
   * Audience. The SYSTEM realm mints `aud: "system"` for a session and
   * `aud: "system-preauth"` for the pre-authentication token; JWT allows either
   * a single string or an array.
   */
  readonly aud?: string | readonly string[]
  /** Issuer (`mfin:system` in the SYSTEM realm). */
  readonly iss?: string
  /** SYSTEM realm role (`superadmin` | `operator` | `i18n_editor`). */
  readonly role?: string
  /** Authentication method the token was minted for (`password+totp`, `recovery_code`). */
  readonly amr?: string
}

const base64UrlDecode = (segment: string): string | null => {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

/**
 * True when the claims belong to a SYSTEM-realm access token. The SYSTEM realm
 * identifies its tokens by audience alone (`aud: "system"`) — unlike the
 * previous contract it carries no `ptype`/`uid` — so this is the single check
 * that keeps a regular PERSON/ORG token from ever satisfying a SYSTEM session.
 *
 * The claims are read without verifying the signature: this decides which store
 * a token is filed under, never whether the server will accept it.
 */
export const isSystemAccessToken = (claims: AccessTokenClaims): boolean => {
  const aud: unknown = claims.aud
  if (typeof aud === 'string') return aud === 'system'
  // JWT also allows a list of audiences; a malformed value grants nothing.
  if (!Array.isArray(aud)) return false
  return aud.some((entry) => entry === 'system')
}

/**
 * Decodes a JWT payload for UI hints only. The signature is NOT verified and the
 * result must never gate access — route guards treat the server as the authority.
 */
export const decodeAccessToken = (token: string): AccessTokenClaims | null => {
  const payload = token.split('.')[1]
  if (payload === undefined) return null
  const json = base64UrlDecode(payload)
  if (json === null) return null
  try {
    const parsed: unknown = JSON.parse(json)
    return typeof parsed === 'object' && parsed !== null ? (parsed as AccessTokenClaims) : null
  } catch {
    return null
  }
}
