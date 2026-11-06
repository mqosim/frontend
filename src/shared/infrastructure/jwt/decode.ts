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
