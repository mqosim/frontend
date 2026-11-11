/**
 * Unit tests for the enrollment QR helpers.
 *
 * The QR is built from the one-time `otpauth_uri` returned by
 * `POST /system/auth/totp/enroll`, entirely in the browser. These tests cover
 * the pure path builder and the failure contract: an unsupported payload must
 * return `null` (the UI then shows the text fallback) and must never echo the
 * input, because the URI contains the TOTP secret.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 */
import { describe, expect, test } from 'bun:test'

import {
  buildEnrollmentQr,
  toQrPath,
} from '../../src/features/system-auth/presentation/enrollmentQr'

const OTPAUTH_URI =
  'otpauth://totp/MFIN:ops@example.uz?secret=JBSWY3DPEHPK3PXP&issuer=MFIN&algorithm=SHA1&digits=6&period=30'

describe('toQrPath', () => {
  test('emits one closed run per dark module for a small matrix', () => {
    expect(
      toQrPath([
        [true, false],
        [false, true],
      ]),
    ).toBe('M0 0h1v1h-1zM1 1h1v1h-1z')
  })

  test('merges horizontally adjacent dark modules into one run', () => {
    expect(toQrPath([[true, true, false, true]])).toBe('M0 0h2v1h-2zM3 0h1v1h-1z')
  })

  test('returns an empty path when nothing is dark', () => {
    expect(toQrPath([[false, false, false]])).toBe('')
  })
})

describe('buildEnrollmentQr', () => {
  test('encodes the otpauth URI with a four-module quiet zone', async () => {
    const qr = await buildEnrollmentQr(OTPAUTH_URI)
    expect(qr).not.toBeNull()
    if (qr === null) return
    // A QR code is at least 21 modules; the quiet zone adds 4 on every side.
    expect(qr.size).toBeGreaterThanOrEqual(29)
    expect(qr.size % 2).toBe(1)
    // The first dark module of the top-left finder pattern sits at (4, 4).
    expect(qr.path.startsWith('M4 4')).toBe(true)
    expect(qr.path.endsWith('z')).toBe(true)
    // The path is SVG path data only, never markup that could be injected.
    expect(qr.path).not.toMatch(/[<>"']/)
  })

  test('returns null for an oversized payload and never echoes the input', async () => {
    const oversized = 'x'.repeat(8000)
    const qr = await buildEnrollmentQr(oversized)
    expect(qr).toBeNull()
    expect(JSON.stringify(qr)).not.toContain(oversized.slice(0, 20))
  })
})
