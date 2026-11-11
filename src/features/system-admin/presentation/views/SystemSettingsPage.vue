<script setup lang="ts">
import { inject } from 'vue'
import { useI18n } from 'vue-i18n'

import { I18nFeatureKey } from '@/features/i18n'
import { AppearanceSettingsSection, LanguageSettingsSection } from '@/features/settings'

/**
 * The Superadmin's own Settings page, following the regular Settings' section
 * order (Language, then Appearance). Both sections are the shared settings
 * feature components: Appearance applies through the shared theme store, and
 * Language only switches this browser's locale — the SYSTEM realm has no
 * saved-language endpoint, so the choice is not persisted to the account.
 */
const { t } = useI18n()
const i18nFeature = inject(I18nFeatureKey)
if (i18nFeature === undefined) {
  throw new Error('I18n feature was not provided by the composition root')
}

const applyLanguage = async (languageCode: string): Promise<string> => {
  // Local only: the SYSTEM contract exposes no language preference to write.
  await i18nFeature.switchTo(languageCode, ['system.admin', 'common', 'settings'])
  return languageCode
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
