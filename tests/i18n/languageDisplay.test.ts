/**
 * Unit tests for the language switcher's display metadata: native names and
 * flag resolution across every code form the UI can encounter.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 *
 * The active-languages API serves canonical codes (`uz-Cyrl`, hyphenated) and
 * the backend's `native_name` already carries the exact native labels; these
 * tests pin that both code forms — including the underscore variant seen in
 * stored data — resolve to the same native name and the same flag, and that
 * names never depend on the active UI language.
 */
import { describe, expect, test } from 'bun:test'

import { flagFor } from '../../src/features/i18n/presentation/components/flags'
import {
  languageLabelFor,
  nativeNameFor,
} from '../../src/features/i18n/presentation/components/languageLabels'

describe('nativeNameFor', () => {
  test('returns the exact native labels for the four languages', () => {
    expect(nativeNameFor('uz')).toBe("O'zbekcha")
    expect(nativeNameFor('uz-Cyrl')).toBe('Ўзбекча')
    expect(nativeNameFor('uz_Cyrl')).toBe('Ўзбекча')
    expect(nativeNameFor('uzc')).toBe('Ўзбекча')
    expect(nativeNameFor('ru')).toBe('Русский')
    expect(nativeNameFor('en')).toBe('English')
  })

  test('is case- and whitespace-tolerant', () => {
    expect(nativeNameFor(' UZ ')).toBe("O'zbekcha")
    expect(nativeNameFor('uz-cyrl')).toBe('Ўзбекча')
  })

  test('returns null for unknown codes so the caller can fall back', () => {
    expect(nativeNameFor('de')).toBeNull()
    expect(nativeNameFor('')).toBeNull()
  })
})

describe('languageLabelFor', () => {
  test('short labels stay native abbreviations for the compact selector', () => {
    expect(languageLabelFor('uz')).toEqual({ label: "O'z", lang: 'uz' })
    expect(languageLabelFor('uz-Cyrl')).toEqual({ label: 'Ўз', lang: 'uzc' })
    expect(languageLabelFor('uz_Cyrl')).toEqual({ label: 'Ўз', lang: 'uzc' })
    expect(languageLabelFor('ru')).toEqual({ label: 'Ру', lang: 'ru' })
    expect(languageLabelFor('en')).toEqual({ label: 'En', lang: 'en' })
  })
})

describe('flagFor', () => {
  test('resolves the Uzbekistan flag for every Uzbek form', () => {
    const uzFlag = flagFor('uz')
    expect(uzFlag).not.toBeNull()
    expect(flagFor('uz-Cyrl')).toEqual(uzFlag)
    expect(flagFor('uz_Cyrl')).toEqual(uzFlag)
    expect(flagFor('uzc')).toEqual(uzFlag)
  })

  test('keeps the Russian and English flags distinct', () => {
    expect(flagFor('ru')).not.toBeNull()
    expect(flagFor('ru')).not.toEqual(flagFor('uz'))
    expect(flagFor('en')).not.toBeNull()
    expect(flagFor('en')).not.toEqual(flagFor('ru'))
  })

  test('falls back to null for unknown codes (neutral circle in FlagIcon)', () => {
    expect(flagFor('de')).toBeNull()
  })
})
