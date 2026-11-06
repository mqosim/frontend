<script setup lang="ts">
import { computed, inject, onMounted, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAuthUseCases } from '@/features/auth'
import { I18nFeatureKey, LanguageSwitcher, useLocaleStore } from '@/features/i18n'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import { errorMessageKey } from '@/shared/presentation/errors/messages'

import SettingsButton from '../components/SettingsButton.vue'

/**
 * The Language settings section: the Settings-based language selection, restored
 * after the header selector was removed. The switcher (click-open, full labels,
 * flags) holds a draft until Save — Save persists the choice to the account
 * (`updateLanguage`) before the locale flips, and Cancel discards it. The option
 * list comes from the active-languages API via the i18n feature; no language
 * list is duplicated here. Panel, typography, card chrome, and action buttons
 * follow the Account Security section's conventions so the two sections read as
 * one page.
 *
 * An `apply` prop replaces the account write with a custom persistence step —
 * the SYSTEM settings page saves to the SYSTEM account
 * (PUT /api/v1/system/users/me) and then switches the locale itself. Every
 * other behaviour stays identical.
 */
const props = defineProps<{
  /**
   * Applies the drafted language and resolves with the code that was actually
   * saved; a rejection surfaces the generic error. When omitted, the section
   * persists to the regular account, as every PERSON/ORG Settings page does.
   */
  apply?: (languageCode: string) => Promise<string>
}>()

const { t } = useI18n()
const auth = useAuthUseCases()
const localeStore = useLocaleStore()
const i18nFeature = inject(I18nFeatureKey)
const titleId = useId()

// Options come from the active-languages endpoint. `loadLanguages` is cache-first
// and idempotent, so calling it here is safe even if it already ran on a public
// page.
const languagesReady = computed(() => localeStore.languages.length > 0)

const loading = ref(true)
const errorKey = ref<string | null>(null)

// The chosen language is a draft until Save: the selector shows `draft` while
// `savedLanguage` tracks the last persisted value, so nothing is written to the
// account before confirmation.
const savedLanguage = ref(localeStore.locale)
const draft = ref(localeStore.locale)
const dirty = computed(() => draft.value !== savedLanguage.value)

onMounted(async () => {
  await i18nFeature?.loadLanguages()

  if (props.apply === undefined) {
    // The saved value comes from the profile, which the router guard already
    // synced to the account language (`adoptAccountLanguage`).
    const profile = await auth.getProfile()
    loading.value = false

    if (!profile.ok) {
      errorKey.value = errorMessageKey(profile.error)
      return
    }

    const saved = profile.value.languageCode ?? localeStore.locale
    savedLanguage.value = saved
    draft.value = saved
  } else {
    // A custom `apply` has no profile to read: the locale store already holds
    // the language the router guard adopted at sign-in.
    loading.value = false
  }

  if (!languagesReady.value) {
    // Without options the control cannot work; surface a generic failure rather
    // than rendering a dead selector.
    errorKey.value = 'errors.generic'
  }
})

// Keep the draft in sync when the applied locale changes elsewhere (e.g. the
// guard adopting the account language). Picking a language in the selector only
// updates the draft and never touches the store, so it cannot clobber a pending
// choice here.
watch(
  () => localeStore.locale,
  (next) => {
    if (loading.value || next === savedLanguage.value) return
    savedLanguage.value = next
    draft.value = next
  },
)

const onSelect = (code: string): void => {
  draft.value = code
  errorKey.value = null
}

const onCancel = (): void => {
  draft.value = savedLanguage.value
  errorKey.value = null
}

// Apply and persist the pending choice only on Save, then load the phrases for
// the new locale. A failed write keeps the draft so the user can retry.
const onSave = async (): Promise<void> => {
  errorKey.value = null

  if (props.apply !== undefined) {
    try {
      const applied = await props.apply(draft.value)
      savedLanguage.value = applied
      draft.value = applied
    } catch {
      errorKey.value = 'errors.generic'
    }
    return
  }

  const result = await auth.updateLanguage(draft.value)
  if (!result.ok) {
    errorKey.value =
      result.error.kind === 'Validation'
        ? 'settings.invalid_language'
        : errorMessageKey(result.error)
    return
  }

  const applied = result.value.languageCode ?? draft.value
  savedLanguage.value = applied
  draft.value = applied
  await i18nFeature?.switchTo(applied, ['settings', 'org', 'common'])
}
</script>

<template>
  <section class="language-section" :aria-labelledby="titleId">
    <h2 :id="titleId" class="language-section__title">{{ t('common.language') }}</h2>
    <p class="language-section__hint">{{ t('settings.language_hint') }}</p>

    <p v-if="loading" class="language-section__loading">{{ t('common.loading') }}</p>

    <template v-else>
      <AppAlert v-if="errorKey" variant="error">{{ t(errorKey) }}</AppAlert>

      <div v-if="languagesReady" class="language-section__card">
        <div class="language-section__selector">
          <LanguageSwitcher
            prioritize-selected
            full-labels
            inline-menu
            rect-flags
            :selected="draft"
            @select="onSelect"
          />
        </div>

        <!-- The row stays visible like the security cards' actions; both buttons
             only engage once the draft differs from the saved language. -->
        <div class="language-section__actions">
          <SettingsButton variant="secondary" :disabled="!dirty" @click="onCancel">
            {{ t('action.cancel') }}
          </SettingsButton>
          <SettingsButton :disabled="!dirty" @click="onSave">{{ t('action.save') }}</SettingsButton>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.language-section {
  margin-top: 16px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background-color: var(--color-surface);
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.language-section__title {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  color: var(--color-text);
}

.language-section__hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.language-section__loading {
  margin: 16px 0 0;
  color: var(--color-text-muted);
}

.language-section__selector {
  display: flex;
}

/* Inner card matching the security cards' chrome (22px padding, 1px border,
   9px radius, subtle shadow) so the box-in-box structure reads the same. */
.language-section__card {
  margin-top: 20px;
  padding: 22px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background-color: var(--color-surface);
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

/* Right-aligned row with the security cards' 18px gap; below the cards'
   breakpoint the buttons stack full-width, primary last. */
.language-section__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 18px;
  margin-top: 16px;
}

@media (max-width: 47.99rem) {
  .language-section__actions {
    flex-direction: column-reverse;
  }

  .language-section__actions > * {
    width: 100%;
  }
}
</style>
