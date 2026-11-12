/**
 * Unit tests for the SYSTEM i18n mappers: the catalog entities, the request
 * bodies (snake_case on the wire, camelCase in the domain) and the bulk-import
 * report, including the null defaults the UI relies on.
 *
 * Run with:
 *
 *   bun --tsconfig-override=tsconfig.app.json test tests/
 */
import { describe, expect, test } from 'bun:test'

import {
  toAdminImportReport,
  toAdminLanguage,
  toAdminMissingLanguage,
  toAdminPhrase,
  toAdminTranslationPage,
  toImportRequest,
  toLanguageUpdateRequest,
  toPageCreateRequest,
  toPageUpdateRequest,
  toPhraseUpsertRequest,
} from '../../src/features/system-admin/infrastructure/i18nMappers'

describe('language mapping', () => {
  test('maps the language row to the domain entity', () => {
    expect(
      toAdminLanguage({
        code: 'uz-Cyrl',
        name: 'Uzbek (Cyrillic)',
        native_name: 'Ўзбекча',
        script: 'Cyrl',
        is_active: true,
        is_default: false,
        sort_order: 2,
      }),
    ).toEqual({
      code: 'uz-Cyrl',
      name: 'Uzbek (Cyrillic)',
      nativeName: 'Ўзбекча',
      script: 'Cyrl',
      isActive: true,
      isDefault: false,
      sortOrder: 2,
    })
  })

  test('a patch only carries the fields it changes', () => {
    expect(toLanguageUpdateRequest({ isActive: false })).toEqual({ is_active: false })
    expect(toLanguageUpdateRequest({ isDefault: true })).toEqual({ is_default: true })
    expect(toLanguageUpdateRequest({ isActive: true, isDefault: false })).toEqual({
      is_active: true,
      is_default: false,
    })
  })
})

describe('page mapping', () => {
  test('defaults an absent description to null', () => {
    expect(
      toAdminTranslationPage({ key: 'system.admin', is_active: true, phrase_count: 12 }),
    ).toEqual({ key: 'system.admin', description: null, isActive: true, phraseCount: 12 })
  })

  test('maps the create payload to the snake_case body', () => {
    expect(
      toPageCreateRequest({ key: 'billing.invoices', description: 'Invoices', isActive: false }),
    ).toEqual({
      key: 'billing.invoices',
      description: 'Invoices',
      is_active: false,
    })
    expect(toPageCreateRequest({ key: 'billing.invoices', isActive: true })).toEqual({
      key: 'billing.invoices',
      is_active: true,
    })
  })

  test('a page patch omits untouched fields', () => {
    expect(toPageUpdateRequest({ isActive: false })).toEqual({ is_active: false })
    expect(toPageUpdateRequest({ description: null })).toEqual({ description: null })
    expect(toPageUpdateRequest({})).toEqual({})
  })
})

describe('phrase mapping', () => {
  test('copies the per-language values', () => {
    const dto = {
      page_key: 'system.admin',
      phrase_key: 'system.nav_audit',
      values: { uz: 'Audit', uzc: 'Аудит' },
    }
    const phrase = toAdminPhrase(dto)
    expect(phrase).toEqual({
      pageKey: 'system.admin',
      phraseKey: 'system.nav_audit',
      values: { uz: 'Audit', uzc: 'Аудит' },
    })
    // The mapper owns the object it hands to the UI.
    expect(phrase.values).not.toBe(dto.values)
  })

  test('wraps the values as the upsert body', () => {
    expect(toPhraseUpsertRequest({ en: 'Hello', ru: 'Привет' })).toEqual({
      values: { en: 'Hello', ru: 'Привет' },
    })
  })
})

describe('missing-translation mapping', () => {
  test('copies the per-page counts', () => {
    expect(
      toAdminMissingLanguage({
        code: 'ru',
        total: 3,
        pages: { 'system.admin': 2, 'auth.login': 1 },
      }),
    ).toEqual({ code: 'ru', total: 3, pages: { 'system.admin': 2, 'auth.login': 1 } })
  })
})

describe('bulk import mapping', () => {
  test('maps pages (string and object forms) and the flags', () => {
    expect(
      toImportRequest({
        pages: [
          'system.admin',
          { key: 'billing.invoices', description: 'Invoices', isActive: true },
        ],
        phrases: { 'system.admin': { 'system.nav_audit': { en: 'Audit' } } },
        overwrite: true,
        dryRun: false,
      }),
    ).toEqual({
      pages: [
        'system.admin',
        { key: 'billing.invoices', description: 'Invoices', is_active: true },
      ],
      phrases: { 'system.admin': { 'system.nav_audit': { en: 'Audit' } } },
      overwrite: true,
      dry_run: false,
    })
  })

  test('keeps an explicit null section null', () => {
    expect(toImportRequest({ pages: null, phrases: null, overwrite: false, dryRun: true })).toEqual(
      { pages: null, phrases: null, overwrite: false, dry_run: true },
    )
  })

  test('maps the report, its conflicts and the null revision default', () => {
    const report = toAdminImportReport({
      pages_created: 1,
      phrases_created: 2,
      inserted: 3,
      updated: 4,
      unchanged: 5,
      conflicts: [
        { page_key: 'system.admin', phrase_key: 'system.nav_audit', language_code: 'ru' },
      ],
      per_language: { en: 3, ru: 0 },
      missing_per_language: { en: 0, ru: 2 },
      dry_run: true,
    })
    expect(report).toEqual({
      pagesCreated: 1,
      phrasesCreated: 2,
      inserted: 3,
      updated: 4,
      unchanged: 5,
      conflicts: [{ pageKey: 'system.admin', phraseKey: 'system.nav_audit', languageCode: 'ru' }],
      perLanguage: { en: 3, ru: 0 },
      missingPerLanguage: { en: 0, ru: 2 },
      dryRun: true,
      revision: null,
    })
  })
})
