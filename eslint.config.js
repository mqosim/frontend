import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'
import boundaries from 'eslint-plugin-boundaries'
import prettier from 'eslint-config-prettier'

// ── Architecture model ────────────────────────────────────────────────────
// Every layer directory is its own architectural element, so a dependency
// crossing a layer (or a feature) is always a cross-element dependency and is
// therefore checkable. Dependencies may only point inward: presentation ->
// application -> domain, with infrastructure implementing domain ports.
const FEATURES = ['home', 'auth', 'system-auth', 'i18n', 'org-dashboard', 'settings']
const LAYERS = ['domain', 'application', 'infrastructure', 'presentation']
const SHARED_LAYERS = ['domain', 'infrastructure', 'presentation']

const shared = (layer) => `shared/${layer}`
const feat = (feature, layer) => `${feature}/${layer}`
const publicType = (feature) => `${feature}/public`

const allFeatureLayers = FEATURES.flatMap((f) => LAYERS.map((l) => feat(f, l)))
const allPublicTypes = FEATURES.map(publicType)
const allSharedTypes = SHARED_LAYERS.map(shared)

const elements = [
  { type: 'app', pattern: 'src/app/**', partialMatch: false },
  ...SHARED_LAYERS.map((layer) => ({
    type: shared(layer),
    pattern: `src/shared/${layer}/**`,
    partialMatch: false,
  })),
  ...FEATURES.flatMap((feature) => [
    // A feature's only cross-feature entry point.
    { type: publicType(feature), pattern: `src/features/${feature}/index.ts`, partialMatch: false },
    ...LAYERS.map((layer) => ({
      type: feat(feature, layer),
      pattern: `src/features/${feature}/${layer}/**`,
      partialMatch: false,
    })),
  ]),
]

// What each layer of a feature is allowed to depend on, within that feature.
const featureLayerAllows = {
  domain: (f) => [feat(f, 'domain'), shared('domain')],
  application: (f) => [feat(f, 'application'), feat(f, 'domain'), shared('domain')],
  infrastructure: (f) => [
    feat(f, 'infrastructure'),
    feat(f, 'domain'),
    shared('domain'),
    shared('infrastructure'),
  ],
  presentation: (f) => [
    feat(f, 'presentation'),
    feat(f, 'application'),
    feat(f, 'domain'),
    shared('domain'),
    shared('presentation'),
  ],
}

const featureInfrastructureTypes = FEATURES.map((f) => feat(f, 'infrastructure'))
const featurePresentationTypes = FEATURES.map((f) => feat(f, 'presentation'))

const policies = [
  // ── External packages ────────────────────────────────────────────────
  // Infrastructure may only pull the generated-client dependency, so UI
  // libraries (Vue, Pinia, ...) can never leak into it.
  {
    from: {
      element: { types: { anyOf: [shared('infrastructure'), ...featureInfrastructureTypes] } },
    },
    allow: { to: { module: { origin: 'external', source: ['openapi-fetch'] } } },
  },
  // Presentation may use UI libraries.
  {
    from: { element: { types: { anyOf: [shared('presentation'), ...featurePresentationTypes] } } },
    allow: { to: { module: { origin: 'external' } } },
  },
  // The composition root may use anything.
  {
    from: { element: { type: 'app' } },
    allow: { to: { module: { origin: 'external' } } },
  },

  // ── Internal layers ──────────────────────────────────────────────────
  ...FEATURES.flatMap((feature) =>
    LAYERS.map((layer) => ({
      from: { element: { type: feat(feature, layer) } },
      allow: { to: { element: { types: { anyOf: featureLayerAllows[layer](feature) } } } },
    })),
  ),

  // ── Shared kernel ────────────────────────────────────────────────────
  {
    from: { element: { type: shared('domain') } },
    allow: { to: { element: { types: { anyOf: [shared('domain')] } } } },
  },
  {
    from: { element: { type: shared('infrastructure') } },
    allow: { to: { element: { types: { anyOf: [shared('infrastructure'), shared('domain')] } } } },
  },
  {
    from: { element: { type: shared('presentation') } },
    allow: { to: { element: { types: { anyOf: [shared('presentation'), shared('domain')] } } } },
  },

  // ── Feature-to-feature: public index.ts only ─────────────────────
  {
    from: { element: { types: { anyOf: allFeatureLayers } } },
    allow: { to: { element: { types: { anyOf: allPublicTypes } } } },
  },

  // ── A feature's public barrel re-exports its own layers ───────────
  ...FEATURES.map((feature) => ({
    from: { element: { type: publicType(feature) } },
    allow: {
      to: {
        element: {
          types: {
            anyOf: [...LAYERS.map((layer) => feat(feature, layer)), ...allSharedTypes],
          },
        },
      },
    },
  })),

  // ── Composition root reaches into everything ─────────────────────────
  {
    from: { element: { type: 'app' } },
    allow: {
      to: {
        element: { types: { anyOf: [...allSharedTypes, ...allFeatureLayers, ...allPublicTypes] } },
      },
    },
  },
]

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
  },

  {
    files: ['**/*.vue'],
    rules: {
      // `App.vue` is the conventional single-word root component name.
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
    },
  },

  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { boundaries },
    settings: {
      // Without an explicit root path, dependency targets are resolved as
      // absolute paths and never match the relative element patterns.
      'boundaries/root-path': import.meta.dirname,
      'boundaries/elements': elements,
      // The plugin resolves each import target with eslint-module-utils, whose
      // default resolver cannot resolve extensionless TypeScript imports, leaving
      // every internal target "unknown". A TS-aware resolver fixes classification.
      'import/resolver': {
        typescript: {
          project: [
            `${import.meta.dirname}/tsconfig.app.json`,
            `${import.meta.dirname}/tsconfig.node.json`,
          ],
          alwaysTryTypes: true,
          noWarnOnMultipleProjects: true,
          // Resolve SFCs so intra-layer `.vue` imports classify to their element
          // instead of being left "unknown" (which the disallow default would flag).
          extensions: ['.ts', '.tsx', '.d.ts', '.js', '.jsx', '.json', '.node', '.vue'],
        },
      },
    },
    rules: {
      // `_`-prefixed parameters are intentionally unused (e.g. the unimplemented
      // real E-IMZO adapter keeps the port's signature).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          // Also evaluate external/core module targets, so a domain layer
          // importing `vue` (or any library) is reported, not silently ignored.
          checkAllOrigins: true,
          policies,
        },
      ],
    },
  },

  // The generated client is machine-produced; it participates in boundary
  // classification but must not be held to hand-written style rules.
  {
    files: ['src/shared/infrastructure/api/schema.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },

  {
    files: ['scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },

  // The pre-paint theme script ships as a plain browser script from public/.
  {
    files: ['public/**/*.js'],
    languageOptions: { globals: { ...globals.browser } },
  },

  // Vendored third-party E-IMZO client (see public/e-imzo/README.md). It ships
  // verbatim and must not be restyled. The folder is intentionally NOT ignored:
  // an `ignores` entry makes editors/CLI emit "file ignored" when asked to lint
  // a single file. Disabling its rules here keeps the files pristine and lint-clean.
  {
    files: ['public/e-imzo/**/*.js'],
    rules: {
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-control-regex': 'off',
      'no-useless-escape': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  prettier,
)
