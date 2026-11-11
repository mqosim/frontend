/**
 * Unit tests for the shared JWT hint decoder.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 *
 * The decoder is a UI hint only — it never verifies a signature — but one of its
 * answers is load-bearing: `isSystemAccessToken` decides whether a token may
 * open a SYSTEM session. The SYSTEM realm identifies its tokens by audience
 * alone (`aud: "system"`), so a regular PERSON/ORG token (no `aud`, or a
 * different one) must never pass. These tests pin that rule, including the
 * array form of `aud` that JWT also allows.
 */
import { describe, expect, test } from 'bun:test'

import {
  decodeAccessToken,
  isSystemAccessToken,
} from '../../src/shared/infrastructure/jwt/decode'

/** Base64url-encodes one JWT segment without padding, as the wire format does. */
const rawSegment = (text: string): string =>
  btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** Encodes a JSON payload the way the backend does. */
const segment = (value: unknown): string => rawSegment(JSON.stringify(value))

/** Builds a structurally valid JWT with the given (unsigned) payload. */
const token = (payload: unknown): string => `${segment({ alg: 'none' })}.${segment(payload)}.sig`

describe('decodeAccessToken', () => {
  test('reads the payload of a well-formed token', () => {
    const claims = { sub: 'sys-1', exp: 1_700_000_000, aud: 'system', role: 'superadmin' }

    expect(decodeAccessToken(token(claims))).toEqual(claims)
  })

  test('returns null when the token has no payload segment', () => {
    expect(decodeAccessToken('only-one-part')).toBeNull()
  })

  test('returns null when the payload is not base64url at all', () => {
    expect(decodeAccessToken('header.$$$.signature')).toBeNull()
  })

  test('returns null when the payload is not valid JSON', () => {
    // Decodable base64url, but the bytes are not JSON.
    expect(decodeAccessToken(`header.${rawSegment('not-json')}.signature`)).toBeNull()
  })

  test('returns null when the payload is valid JSON but not an object', () => {
    expect(decodeAccessToken(token(42))).toBeNull()
    expect(decodeAccessToken(token(null))).toBeNull()
  })
})

describe('isSystemAccessToken', () => {
  test('accepts the SYSTEM audience as a string', () => {
    expect(isSystemAccessToken({ aud: 'system' })).toBe(true)
  })

  test('accepts the SYSTEM audience inside a list', () => {
    expect(isSystemAccessToken({ aud: ['system'] })).toBe(true)
    expect(isSystemAccessToken({ aud: ['identity', 'system'] })).toBe(true)
  })

  test('rejects the pre-authentication audience', () => {
    expect(isSystemAccessToken({ aud: 'system-preauth' })).toBe(false)
    expect(isSystemAccessToken({ aud: ['system-preauth'] })).toBe(false)
  })

  test('rejects a regular realm token that carries no SYSTEM audience', () => {
    expect(isSystemAccessToken({})).toBe(false)
    expect(isSystemAccessToken({ ptype: 'PERSON', aud: 'identity' })).toBe(false)
    expect(isSystemAccessToken({ aud: ['identity'] })).toBe(false)
  })

  test('rejects malformed audience values instead of trusting them', () => {
    // The claims come from an unverified payload, so a non-string/list shape
    // must grant nothing rather than coerce.
    expect(isSystemAccessToken({ aud: 42 as unknown as string })).toBe(false)
    expect(isSystemAccessToken({ aud: null as unknown as string })).toBe(false)
  })
})
