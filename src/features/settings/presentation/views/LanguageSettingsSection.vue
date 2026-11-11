<script setup lang="ts">
import { computed, inject, onMounted, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAuthUseCases } from '@/features/auth'
import {
  fromApiLang,
  I18nFeatureKey,
  LanguageSwitcher,
  toApiLang,
  toApiLanguageCode,
  useLocaleStore,
} from '@/features/i18n'
import { useNotificationsUseCases } from '@/features/notifications'
import type { AppError } from '@/shared/domain'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import { errorMessageKey } from '@/shared/presentation/errors/messages'

import SettingsButton from '../components/SettingsButton.vue'

/**
 * The Language settings section: the Settings-based language selection, restored
 * after the header selector was removed. The switcher (click-open, full labels,
 * flags) holds a draft until Save — Save persists the choice to the account
 * first (`PATCH /api/v1/identity/me`), then switches the locale, then keeps the
 * notification language in step (`PUT /api/v1/notifications/preferences`, a full
 * replacement, so the document-event setting is read first). A failed account
 * write shows the error and changes nothing; a failed notification sync is
 * soft — the language stays switched and a warning explains the gap. Cancel
 * discards the draft. The option list comes from the active-languages API via
 * the i18n feature; no language list is duplicated here. Panel, typography,
 * card chrome, and action buttons follow the Account Security section's
 * conventions so the two sections read as one page.
 *
 * An `apply` prop replaces the account write with a custom persistence step —
 * the SYSTEM settings page uses it to write `PATCH /system/auth/me` (SYSTEM has
 * no notification preferences). The implementation throws the repository's
 * `AppError` on failure, which this section maps to copy by machine code; every
 * other behaviour stays identical.
 */
const props = defineProps<{
  /**
   * Applies the drafted language and resolves with the code that was actually
   * saved; a rejection surfaces the error by its machine code. When omitted,
   * the section persists to the regular account, as every PERSON/ORG Settings
   * page does.
   */
  apply?: (languageCode: string) => Promise<string>
}>()

const { t } = useI18n()
const auth = useAuthUseCases()
const notifications = useNotificationsUseCases()
const localeStore = useLocaleStore()
const i18nFeature = inject(I18nFeatureKey)
const titleId = useId()

// Options come from the active-languages endpoint. `loadLanguages` is cache-first
// and idempotent, so calling it here is safe even if it already ran on a public
// page.
const languagesReady = computed(() => localeStore.languages.length > 0)

const loading = ref(true)
const errorKey = ref<string | null>(null)
// A soft, non-blocking notice: the language WAS saved, only the notification
// sync afterwards failed, so the UI must not read as a failed save.
const warningKey = ref<string | null>(null)

// The chosen language is a draft until Save: the selector shows `draft` while
// `savedLanguage` tracks the last persisted value, so nothing is written to the
// account before confirmation.
const savedLanguage = ref(localeStore.locale)
const draft = ref(localeStore.locale)
const dirty = computed(() => draft.value !== savedLanguage.value)

onMounted(async () => {
  await i18nFeature?.loadLanguages()

  if (props.apply === undefined) {
    // The saved language lives on `/identity/me` (`language_code`) and the
    // router guard already adopted it into the locale store; this read
    // refreshes the displayed value from the account (adoption may have kept
    // the browser's choice when the profile read failed). A failure or a null
    // code — the account never chose one — keeps that current choice as the
    // displayed value.
    const profile = await auth.getProfile()
    loading.value = false

    if (profile.ok && profile.value.languageCode !== null) {
      // The contract speaks `uz-Cyrl`; `fromApiLang` restores the app's
      // internal `uzc` before the switcher sees it.
      const saved = fromApiLang(profile.value.languageCode)
      savedLanguage.value = saved
      draft.value = saved
    }
  } else {
    // A custom `apply` has no regular profile to read: the locale store already
    // holds the language the SYSTEM guard adopted at sign-in.
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
  warningKey.value = null
}

const onCancel = (): void => {
  draft.value = savedLanguage.value
  errorKey.value = null
  warningKey.value = null
}

// Apply and persist the pending choice only on Save. The account write goes
// first (`PATCH /identity/me`); the UI switches only after it succeeds, and the
// notification sync afterwards is best-effort. A failed account write keeps the
// draft so the user can retry.
const onSave = async (): Promise<void> => {
  errorKey.value = null
  warningKey.value = null

  if (props.apply !== undefined) {
    try {
      const applied = await props.apply(draft.value)
      savedLanguage.value = applied
      draft.value = applied
    } catch (error) {
      // `apply` implementations throw the repository's `AppError`; anything
      // else (an unexpected crash) falls back to the generic copy.
      errorKey.value = errorMessageKey(error as AppError)
    }
    return
  }

  // 1) Resolve the draft to a code the backend accepts and persist it first;
  //    nothing else happens when this fails, so the UI never shows a language
  //    the account does not know about. A stale draft (a later-deactivated
  //    language restored from storage) fails here without a request.
  const languageCode = toApiLanguageCode(draft.value)
  if (languageCode === null) {
    errorKey.value = 'settings.invalid_language'
    return
  }
  const saved = await auth.updateLanguage(languageCode)
  if (!saved.ok) {
    errorKey.value =
      saved.error.kind === 'Validation' ? 'settings.invalid_language' : errorMessageKey(saved.error)
    return
  }

  // 2) Switch the UI — translations load before the locale flips — and remember
  //    the code the account actually reports. `fromApiLang` restores the
  //    internal `uzc` from the contract's `uz-Cyrl`.
  const applied =
    saved.value.languageCode === null ? draft.value : fromApiLang(saved.value.languageCode)
  await i18nFeature?.switchTo(applied, ['settings', 'org', 'common'])
  savedLanguage.value = applied
  draft.value = applied

  // 3) Keep the notification language in step (the product treats them as the
  //    same choice). The PUT is a full replacement, so the use case reads the
  //    current document-event level first. A failure here is soft: the language
  //    stays switched and a warning explains the gap instead of a failed save.
  const synced = await notifications.saveLocale(toApiLang(applied))
  if (!synced.ok) warningKey.value = 'settings.language_sync_failed'
}
</script>

<template>
  <section class="language-section" :aria-labelledby="titleId">
    <h2 :id="titleId" class="language-section__title">{{ t('common.language') }}</h2>
    <p class="language-section__hint">{{ t('settings.language_hint') }}</p>

    <p v-if="loading" class="language-section__loading">{{ t('common.loading') }}</p>

    <template v-else>
      <AppAlert v-if="errorKey" variant="error">{{ t(errorKey) }}</AppAlert>
      <AppAlert v-else-if="warningKey" variant="warning">{{ t(warningKey) }}</AppAlert>

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
