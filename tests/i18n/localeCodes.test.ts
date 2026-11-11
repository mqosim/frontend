/**
 * Unit tests for the saved-language code helper.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 *
 * `toApiLanguageCode` is the only door from the app's internal locale codes to
 * the backend's saved-language endpoints (`MeLanguageUpdateRequest` and its
 * SYSTEM twin): supported codes come back in canonical spelling (the internal
 * `uzc` maps to `uz-Cyrl`), anything else resolves to `null` so callers omit
 * the field or fail the save instead of sending an unknown code.
 */
import { describe, expect, test } from 'bun:test'

import { toApiLanguageCode } from '../../src/features/i18n/domain/localeCodes'

describe('toApiLanguageCode', () => {
  test('returns each supported code in canonical spelling', () => {
    expect(toApiLanguageCode('uz')).toBe('uz')
    expect(toApiLanguageCode('uz-Cyrl')).toBe('uz-Cyrl')
    expect(toApiLanguageCode('ru')).toBe('ru')
    expect(toApiLanguageCode('en')).toBe('en')
  })

  test('maps the internal uzc to uz-Cyrl', () => {
    expect(toApiLanguageCode('uzc')).toBe('uz-Cyrl')
  })

  test('resolves case and whitespace variants to the canonical code', () => {
    expect(toApiLanguageCode(' UZ ')).toBe('uz')
    expect(toApiLanguageCode('uz-cyrl')).toBe('uz-Cyrl')
  })

  test('returns null for unsupported, empty and malformed values', () => {
    expect(toApiLanguageCode('xx')).toBeNull()
    expect(toApiLanguageCode('')).toBeNull()
    expect(toApiLanguageCode('   ')).toBeNull()
    expect(toApiLanguageCode('uz-UZ')).toBeNull()
  })
})
