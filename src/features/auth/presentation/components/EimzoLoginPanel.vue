<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import { credentialErrorMessageKey } from '@/shared/presentation/errors/messages'

import type { EimzoKey } from '../../domain/entities'
import { useAuthUseCases } from '../composables/useAuthUseCases'
import { useAuthOutcome } from '../composables/useAuthOutcome'
import EimzoKeyPicker from './EimzoKeyPicker.vue'

const { t } = useI18n()
const auth = useAuthUseCases()
const { applyOutcome } = useAuthOutcome()

const selectedKey = ref<EimzoKey | null>(null)
const submitting = ref(false)
const formErrorKey = ref('')

const submit = async (): Promise<void> => {
  const key = selectedKey.value
  if (key === null) return

  submitting.value = true
  formErrorKey.value = ''
  const result = await auth.loginWithSignature(key)
  submitting.value = false

  if (!result.ok) {
    formErrorKey.value = credentialErrorMessageKey(result.error)
    return
  }
  applyOutcome(result.value)
}
</script>

<template>
  <div class="eimzo-panel">
    <AppAlert v-if="formErrorKey" variant="error">{{ t(formErrorKey) }}</AppAlert>

    <form novalidate @submit.prevent="submit">
      <EimzoKeyPicker v-model="selectedKey" name="login-eimzo-key" :disabled="submitting">
        <AppButton type="submit" block :loading="submitting" :disabled="selectedKey === null">
          {{ t('auth.sign_in') }}
        </AppButton>
      </EimzoKeyPicker>
    </form>
  </div>
</template>

<style scoped>
.eimzo-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
