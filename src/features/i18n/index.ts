// Public surface of the i18n feature.
export { createI18nFeature } from './presentation/plugin'
export type { I18nFeature } from './presentation/plugin'
export { I18nFeatureKey } from './presentation/di'
export { getCurrentLocale, useLocaleStore } from './presentation/stores/localeStore'
export { toApiLang } from './domain/localeCodes'
export { default as LanguageSwitcher } from './presentation/components/LanguageSwitcher.vue'
