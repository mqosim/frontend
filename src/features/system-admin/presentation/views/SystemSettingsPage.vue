<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'

import { I18nFeatureKey, toApiLanguageCode } from '@/features/i18n'
import { useSystemAuthUseCases } from '@/features/system-auth'
import { AppearanceSettingsSection, LanguageSettingsSection } from '@/features/settings'
import type { AppError } from '@/shared/domain'

/**
 * The Superadmin's own Settings page, following the regular Settings' section
 * order (Language, then Appearance). Both sections are the shared settings
 * feature components: Appearance applies through the shared theme store, and
 * Language persists through `PATCH /system/auth/me` — SYSTEM has no
 * notification preferences, so that single write is the whole save. A failure
 * (an unsupported language among them) propagates as the repository's
 * `AppError`, which the section maps to copy by machine code; the locale only
 * switches after the write succeeds.
 */
const { t } = useI18n()
const i18nFeature = inject(I18nFeatureKey)
if (i18nFeature === undefined) {
  throw new Error('I18n feature was not provided by the composition root')
}
const system = useSystemAuthUseCases()

const applyLanguage = async (languageCode: string): Promise<string> => {
  // Resolve the draft to a code the backend accepts; the switcher only offers
  // active backend languages, so `null` means a stale draft — fail the save
  // locally instead of a 422 round-trip. The section maps the machine code.
  const code = toApiLanguageCode(languageCode)
  if (code === null) {
    const error: AppError = { kind: 'Validation', status: 400, fields: {} }
    throw error
  }
  // Persist to the SYSTEM account first; the UI switches only after it succeeds.
  const saved = await system.updateLanguage(code)
  if (!saved.ok) throw saved.error
  const applied = saved.value.languageCode ?? languageCode
  await i18nFeature.switchTo(applied, ['system.admin', 'common', 'settings'])
  return applied
}
</script>

<template>
  <section class="system-settings">
    <h1 class="system-settings__title">{{ t('action.settings') }}</h1>
    <p class="system-settings__subtitle">{{ t('system.settings_subtitle') }}</p>

    <LanguageSettingsSection :apply="applyLanguage" />
    <AppearanceSettingsSection />
  </section>
</template>

<style scoped>
.system-settings {
  display: flex;
  flex-direction: column;
  max-width: var(--content-max-width-settings);
  padding-top: var(--space-5);
}

.system-settings__title {
  margin: 0;
  font-size: var(--font-size-xl);
}

.system-settings__subtitle {
  margin: var(--space-2) 0 0;
  color: var(--color-text-muted);
}
</style>
