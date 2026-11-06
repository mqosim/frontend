<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useI18n } from 'vue-i18n'

import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import AppPasswordField from '@/shared/presentation/components/AppPasswordField.vue'
import AppTextField from '@/shared/presentation/components/AppTextField.vue'
import { useFocusFirstError } from '@/shared/presentation/composables/useFocusFirstError'
import { useFormField } from '@/shared/presentation/composables/useFormField'
import { credentialErrorMessageKey } from '@/shared/presentation/errors/messages'

import { useAuthUseCases } from '../composables/useAuthUseCases'
import { useAuthOutcome } from '../composables/useAuthOutcome'
import { loginSchema, toLoginIdentifier, type LoginFormValues } from '../schemas'

const { t } = useI18n()
const auth = useAuthUseCases()
const { applyOutcome } = useAuthOutcome()
const { focusFirstError } = useFocusFirstError()

// An i18n key, not a message — the copy is chosen by error kind, never by text.
const formErrorKey = ref('')

const { handleSubmit, isSubmitting } = useForm<LoginFormValues>({
  validationSchema: toTypedSchema(loginSchema),
  initialValues: { identifier: '', password: '' },
})

const {
  value: identifier,
  error: identifierError,
  blur: onIdentifierBlur,
} = useFormField<string>('identifier')
const {
  value: password,
  error: passwordError,
  blur: onPasswordBlur,
} = useFormField<string>('password')

const onSubmit = handleSubmit(
  async (formValues) => {
    formErrorKey.value = ''
    const result = await auth.login({
      ...toLoginIdentifier(formValues.identifier),
      password: formValues.password,
    })
    if (!result.ok) {
      formErrorKey.value = credentialErrorMessageKey(result.error)
      return
    }
    applyOutcome(result.value)
  },
  ({ errors: validationErrors }) => {
    if (Object.keys(validationErrors).length > 0) void focusFirstError()
  },
)
</script>

<template>
  <form class="password-panel" novalidate @submit="onSubmit">
    <AppAlert v-if="formErrorKey" variant="error">{{ t(formErrorKey) }}</AppAlert>

    <AppTextField
      v-model="identifier"
      :label="t('auth.identifier')"
      type="text"
      autocomplete="username"
      :error="identifierError ? t(identifierError) : ''"
      :disabled="isSubmitting"
      @blur="onIdentifierBlur"
    />
    <AppPasswordField
      v-model="password"
      :label="t('auth.password')"
      autocomplete="current-password"
      :error="passwordError ? t(passwordError) : ''"
      :disabled="isSubmitting"
      @blur="onPasswordBlur"
    />

    <AppButton type="submit" block :loading="isSubmitting">{{ t('auth.sign_in') }}</AppButton>
  </form>
</template>

<style scoped>
.password-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
