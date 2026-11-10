/**
 * The E-IMZO endpoints report rejections with machine codes, and the
 * infrastructure maps 502 to `Unknown` and 503 to `ServiceUnavailable` — so
 * the copy must be chosen from the code first. These tests pin that mapping
 * through the real HTTP error mapper.
 */
import { describe, expect, test } from 'bun:test'

import { eimzoCodeKey } from '../../src/shared/presentation/errors/messages'
import { toAppError } from '../../src/shared/infrastructure/http/errors'

const errorOf = (status: number, code: string) =>
  toAppError(new Response(null, { status }), { error: { code, message: 'backend copy' } })

describe('eimzoCodeKey', () => {
  test('maps the fixed backend codes', () => {
    expect(eimzoCodeKey(errorOf(401, 'invalid_certificate'))).toBe(
      'errors.eimzo_invalid_certificate',
    )
    expect(eimzoCodeKey(errorOf(403, 'eimzo_required'))).toBe('errors.eimzo_required')
    expect(eimzoCodeKey(errorOf(403, 'certificate_revoked'))).toBe(
      'errors.eimzo_certificate_revoked',
    )
    expect(eimzoCodeKey(errorOf(502, 'eimzo_error'))).toBe('errors.eimzo_error')
    expect(eimzoCodeKey(errorOf(503, 'eimzo_unavailable'))).toBe('errors.eimzo_unavailable')
    expect(eimzoCodeKey(errorOf(401, 'eimzo_certificate_revoked'))).toBe(
      'errors.eimzo_certificate_revoked',
    )
    expect(eimzoCodeKey(errorOf(401, 'eimzo_challenge_not_found_or_expired'))).toBe(
      'errors.eimzo_challenge_expired',
    )
  })

  test('maps the dynamic reject reasons to the shared rejected copy', () => {
    expect(eimzoCodeKey(errorOf(401, 'eimzo_signature_invalid'))).toBe('errors.eimzo_rejected')
    expect(eimzoCodeKey(errorOf(401, 'eimzo_timestamp_invalid'))).toBe('errors.eimzo_rejected')
  })

  test('returns null for non-E-IMZO codes so the caller falls back', () => {
    expect(eimzoCodeKey(errorOf(401, 'unauthenticated'))).toBeNull()
    expect(eimzoCodeKey(errorOf(401, 'invalid_credentials'))).toBeNull()
    expect(eimzoCodeKey(errorOf(403, 'account_blocked'))).toBeNull()
    expect(eimzoCodeKey(errorOf(429, 'rate_limited'))).toBeNull()
  })

  test('returns null when the body carries no envelope code', () => {
    const error = toAppError(new Response(null, { status: 401 }), null)
    expect(eimzoCodeKey(error)).toBeNull()
  })
})
