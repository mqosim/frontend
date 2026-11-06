import type { InjectionKey } from 'vue'

import type { I18nFeature } from './plugin'

/** Provided by the composition root so views can trigger loads (switcher, etc.). */
export const I18nFeatureKey: InjectionKey<I18nFeature> = Symbol('i18n-feature')
