<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'

import { I18nFeatureKey } from '@/features/i18n'
import { SystemUseCasesKey } from '@/features/system-auth'
import { AppearanceSettingsSection, LanguageSettingsSection } from '@/features/settings'

/**
 * The Superadmin's own Settings page, following the regular Settings' section
 * order (Language, then Appearance). Both sections are the shared settings
 * feature components: Appearance applies through the shared theme store, and
 * Language persists to the SYSTEM account (PUT /api/v1/system/users/me) before
 * the locale flips, so the choice survives sign-out — the router guard
 * re-adopts the saved account language from /system/auth/me at the next
 * sign-in.
 */
const { t } = useI18n()
const i18nFeature = inject(I18nFeatureKey)
if (i18nFeature === undefined) {
  throw new Error('I18n feature was not provided by the composition root')
}
const systemAuth = inject(SystemUseCasesKey)
if (systemAuth === undefined) {
  throw new Error('System auth use cases were not provided by the composition root')
}

const applyLanguage = async (languageCode: string): Promise<string> => {
  // Persist first: a failed write must never flip the UI language (the section
  // keeps the draft so the choice can be retried).
  const result = await systemAuth.updateLanguage(languageCode)
  if (!result.ok) throw new Error('language update failed')
  const applied = result.value.languageCode ?? languageCode
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
