<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { EimzoKeyPicker, useAuthUseCases } from '@/features/auth'
import type { EimzoKey } from '@/features/auth'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import { eimzoCodeKey, errorMessageKey } from '@/shared/presentation/errors/messages'

import SecurityCard from './SecurityCard.vue'
import SettingsButton from './SettingsButton.vue'

/**
 * The E-IMZO link card of the Account Security section: the key picker plus a
 * Link action. Linking signs a fresh server challenge with the selected key
 * (`POST /identity/eimzo/link`, bearer) and, on success, shows the masked
 * PINFL the backend echoes back. The contract exposes no unlink, so the card
 * offers linking only.
 */
const { t } = useI18n()
const auth = useAuthUseCases()

const selectedKey = ref<EimzoKey | null>(null)
const linking = ref(false)
const formErrorKey = ref('')
const linkedPinfl = ref<string | null>(null)

const submit = async (): Promise<void> => {
  const key = selectedKey.value
  if (key === null) return

  linking.value = true
  formErrorKey.value = ''
  const result = await auth.linkEimzo(key)
  linking.value = false

  if (!result.ok) {
    // Rejections carry the contract's E-IMZO codes (a 401 here is a rejected
    // signature or an expired session, distinguishable only by code); a plain
    // `unauthenticated` falls back to the shared session copy.
    formErrorKey.value = eimzoCodeKey(result.error) ?? errorMessageKey(result.error)
    return
  }
  linkedPinfl.value = result.value.pinflMasked
}
</script>

<template>
  <SecurityCard :title="t('settings.eimzo_title')" :hint="t('settings.eimzo_hint')">
    <AppAlert v-if="formErrorKey" variant="error">{{ t(formErrorKey) }}</AppAlert>
    <AppAlert v-if="linkedPinfl !== null" variant="info">
      {{ t('settings.eimzo_linked', { pinfl: linkedPinfl }) }}
    </AppAlert>

    <EimzoKeyPicker v-model="selectedKey" name="settings-eimzo-key" :disabled="linking">
      <SettingsButton
        type="button"
        :loading="linking"
        :disabled="selectedKey === null"
        @click="submit"
      >
        {{ t('settings.eimzo_link') }}
      </SettingsButton>
    </EimzoKeyPicker>
  </SecurityCard>
</template>
