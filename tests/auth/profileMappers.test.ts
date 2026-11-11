/**
 * Unit tests for the profile mappers' language fields.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 *
 * Both realms now expose a saved interface language: `/identity/me` for the
 * regular context and `/system/auth/me` for SYSTEM. These tests pin that the
 * canonical BCP 47 code (`uz-Cyrl`) passes through verbatim — translating to
 * the internal `uzc` is the i18n feature's job (`fromApiLang`) — and that an
 * absent or null code collapses to `null` so the guard keeps the browser's
 * current language.
 */
import { describe, expect, test } from 'bun:test'

import { toUserProfile } from '../../src/features/auth/infrastructure/mappers'
import { toSystemUserProfile } from '../../src/features/system-auth/infrastructure/mappers'

const meBody = {
  id: '018f0000-0000-7000-8000-000000000001',
  full_name: 'ALIYEV ALI',
  email_masked: 'a***@example.uz',
  phone_masked: '+998 90 *** 45 67',
  has_password: true,
}

const systemMeBody = {
  id: 'sys-1',
  email: 'admin@example.com',
  display_name: 'SUPERADMIN',
  role: 'superadmin',
  permissions: ['*'],
  totp_enrolled: true,
}

describe('toUserProfile.languageCode', () => {
  test('maps the saved language verbatim in canonical BCP 47', () => {
    const profile = toUserProfile({ ...meBody, language_code: 'uz-Cyrl' })
    expect(profile?.languageCode).toBe('uz-Cyrl')
  })

  test('collapses an absent or null language to null', () => {
    expect(toUserProfile(meBody)?.languageCode).toBeNull()
    expect(toUserProfile({ ...meBody, language_code: null })?.languageCode).toBeNull()
  })

  test('returns null when the body is missing', () => {
    expect(toUserProfile(undefined)).toBeNull()
  })
})

describe('toSystemUserProfile.languageCode', () => {
  test('maps the saved language verbatim in canonical BCP 47', () => {
    const profile = toSystemUserProfile({ ...systemMeBody, language_code: 'uz-Cyrl' })
    expect(profile?.languageCode).toBe('uz-Cyrl')
  })

  test('collapses an absent or null language to null', () => {
    expect(toSystemUserProfile(systemMeBody)?.languageCode).toBeNull()
    expect(toSystemUserProfile({ ...systemMeBody, language_code: null })?.languageCode).toBeNull()
  })

  test('returns null when the body is missing', () => {
    expect(toSystemUserProfile(undefined)).toBeNull()
  })
})
