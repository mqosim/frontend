/**
 * Guard for Vue I18n message syntax.
 *
 * vue-i18n compiles a message the first time `t()` resolves it. A value that is
 * not valid message syntax — a literal JSON sample with raw `{`/`}` braces, for
 * example — makes `t()` throw, so the component rendering it fails to render.
 * That is how the Import tab of the i18n manager broke: its textarea placeholder
 * comes from `t('system.i18n_import_placeholder')`.
 *
 * This test pushes every message the UI can render through the real compiler,
 * using the app's own `createI18n` options, so an uncompilable value fails here
 * instead of in a browser. A self-check test proves the scan is not vacuous.
 *
 * Coverage: the embedded English `fallbackMessages.ts` and every `uz`/`uzc`/
 * `ru`/`en` value of the translation seed. The seed is read from
 * `docs/phrases-to-seed.json` (this repository's copy) and, when the sibling
 * backend repository is checked out, from `backend/seed/phrases.json` — the file
 * the backend seeder actually imports. The two copies are byte-identical, and a
 * test below pins that.
 *
 * Run with:
 *
 *   bun test --tsconfig-override=tsconfig.app.json tests/
 *
 * The file lives outside `src/` so `vue-tsc -p tsconfig.app.json` never
 * type-checks the `bun:test` imports.
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'bun:test'
import { createI18n } from 'vue-i18n'

import { fallbackMessages } from '../../src/features/i18n/presentation/fallbackMessages'

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const read = (path: string): string => readFileSync(repoRoot + path, 'utf-8')

const LOCALES = ['uz', 'uzc', 'ru', 'en'] as const

const DOCS_SEED = 'docs/phrases-to-seed.json'
const BACKEND_SEED = '../backend/seed/phrases.json'

/** `{page: {phrase: {locale: value}}}` — the layout both seed copies use. */
type Seed = Record<string, Record<string, Record<string, string>>>

const seedOf = (path: string): Seed => JSON.parse(read(path)) as Seed

/** One flat message map per locale, keyed exactly as the app keys it. */
const messagesByLocale = (seed: Seed): Map<string, Record<string, string>> => {
  const byLocale = new Map<string, Record<string, string>>()
  for (const group of Object.values(seed)) {
    for (const [phrase, values] of Object.entries(group)) {
      for (const locale of LOCALES) {
        const value = values[locale]
        if (typeof value !== 'string') continue
        const map = byLocale.get(locale) ?? {}
        map[phrase] = value
        byLocale.set(locale, map)
      }
    }
  }
  return byLocale
}

/**
 * The app's configuration (`presentation/plugin.ts`): non-legacy API, flat
 * dotted keys, no warning noise. `flatJson` rewrites the dotted keys of the
 * object it is given *in place*, and messages only compile on `t()`, so the key
 * list is snapshotted before creation and the instance gets a copy — otherwise
 * the scan would walk page groups instead of phrase keys and silently pass.
 */
const compileAll = (messages: Record<string, Record<string, string>>): string[] => {
  const keysByLocale = Object.entries(messages).map(
    ([locale, map]) => [locale, Object.keys(map)] as const,
  )
  const i18n = createI18n({
    legacy: false,
    globalInjection: true,
    locale: 'en',
    fallbackLocale: 'en',
    messages: structuredClone(messages),
    flatJson: true,
    missingWarn: false,
    fallbackWarn: false,
  })
  const failures: string[] = []
  for (const [locale, keys] of keysByLocale) {
    i18n.global.locale.value = locale
    for (const key of keys) {
      try {
        i18n.global.t(key)
      } catch (error) {
        const message = error instanceof Error ? error.message.split('\n')[0] : String(error)
        failures.push(`${locale}:${key} => ${message ?? ''}`)
      }
    }
  }
  return failures
}

describe('fallbackMessages.ts message syntax', () => {
  test('every embedded message compiles', () => {
    expect(Object.keys(fallbackMessages).length).toBeGreaterThan(0)
    expect(compileAll({ en: fallbackMessages })).toEqual([])
  })
})

describe(`${DOCS_SEED} message syntax`, () => {
  test('every locale value compiles', () => {
    const byLocale = messagesByLocale(seedOf(DOCS_SEED))
    expect(byLocale.size).toBe(LOCALES.length)
    const messages = Object.fromEntries(byLocale)
    for (const locale of LOCALES)
      expect(Object.keys(messages[locale] ?? {}).length).toBeGreaterThan(0)
    expect(compileAll(messages)).toEqual([])
  })
})

const hasBackendSeed = existsSync(repoRoot + BACKEND_SEED)

describe(`backend seed (${BACKEND_SEED}) message syntax`, () => {
  test.skipIf(!hasBackendSeed)('every locale value compiles', () => {
    const byLocale = messagesByLocale(seedOf(BACKEND_SEED))
    expect(byLocale.size).toBe(LOCALES.length)
    expect(compileAll(Object.fromEntries(byLocale))).toEqual([])
  })

  test.skipIf(!hasBackendSeed)('stays identical to the in-repo seed copy', () => {
    expect(read(BACKEND_SEED)).toBe(read(DOCS_SEED))
  })
})

describe('the system.i18n_import_placeholder regression', () => {
  const KEY = 'system.i18n_import_placeholder'

  /** The JSON sample the Import textarea shows, exactly as it must render. */
  const SAMPLE = `{ "phrases": { "page.key": { "phrase.key": { "uz": "…", "uzc": "…", "ru": "…", "en": "…" } } } }`

  const render = (messages: Record<string, Record<string, string>>, locale: string): string => {
    const i18n = createI18n({
      legacy: false,
      globalInjection: true,
      locale,
      fallbackLocale: 'en',
      messages,
      flatJson: true,
      missingWarn: false,
      fallbackWarn: false,
    })
    return i18n.global.t(KEY)
  }

  test('the embedded English value renders the sample byte-for-byte', () => {
    expect(render({ en: structuredClone(fallbackMessages) }, 'en')).toBe(SAMPLE)
  })

  test('every seed locale renders the same sample byte-for-byte', () => {
    const byLocale = messagesByLocale(seedOf(DOCS_SEED))
    for (const locale of LOCALES) {
      const map = byLocale.get(locale)
      if (map === undefined) throw new Error(`seed has no ${locale} messages`)
      expect(render({ [locale]: map, en: structuredClone(fallbackMessages) }, locale)).toBe(SAMPLE)
    }
  })

  test('raw braces are invalid message syntax (why the message escapes them)', () => {
    // A literal `{` fails with "Invalid token in placeholder"; the escaped
    // `{'{'}` renders it. This pins the reason for the escaping.
    expect(() => render({ en: { [KEY]: SAMPLE } }, 'en')).toThrow(/Invalid token in placeholder/)
  })
})

describe('the scan itself', () => {
  test('reports an uncompilable message instead of passing vacuously', () => {
    const failures = compileAll({ en: { 'proof.broken': '{ "phrases": {} }' } })
    expect(failures).toHaveLength(1)
    expect(failures[0]).toContain('proof.broken')
    expect(failures[0]).toContain('Message compilation error')
  })
})
