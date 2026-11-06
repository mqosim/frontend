<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useI18n } from 'vue-i18n'

import { getCurrentLocale } from '@/features/i18n'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import AppPasswordField from '@/shared/presentation/components/AppPasswordField.vue'
import AppTextField from '@/shared/presentation/components/AppTextField.vue'
import { useFocusFirstError } from '@/shared/presentation/composables/useFocusFirstError'
import { useFormField } from '@/shared/presentation/composables/useFormField'
import { errorMessageKey } from '@/shared/presentation/errors/messages'

import type { EimzoKey } from '../../domain/entities'
import { useAuthUseCases } from '../composables/useAuthUseCases'
import { useAuthOutcome } from '../composables/useAuthOutcome'
import { registerSchema, type RegisterFormValues } from '../schemas'
import EimzoKeyPicker from './EimzoKeyPicker.vue'

const { t } = useI18n()
const auth = useAuthUseCases()
const { applyOutcome } = useAuthOutcome()
const { focusFirstError } = useFocusFirstError()

const selectedKey = ref<EimzoKey | null>(null)
// An i18n key, not a message — the copy is chosen by error kind, never by text.
const formErrorKey = ref('')

const { handleSubmit, isSubmitting, meta } = useForm<RegisterFormValues>({
  validationSchema: toTypedSchema(registerSchema),
  initialValues: { email: '', phone: '', password: '' },
})

const { value: email, error: emailError, blur: onEmailBlur } = useFormField<string>('email')
const { value: phone, error: phoneError, blur: onPhoneBlur } = useFormField<string>('phone')
const {
  value: password,
  error: passwordError,
  blur: onPasswordBlur,
} = useFormField<string>('password')

const onSubmit = handleSubmit(
  async (formValues) => {
    const key = selectedKey.value
    if (key === null) return

    formErrorKey.value = ''
    const result = await auth.register(
      {
        email: formValues.email,
        phoneNumber: formValues.phone,
        password: formValues.password,
        languageCode: getCurrentLocale(),
      },
      key,
    )
    if (!result.ok) {
      // 409 (already registered) and the rest are chosen by error kind, never text.
      formErrorKey.value = errorMessageKey(result.error)
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
  <form class="eimzo-register" novalidate @submit="onSubmit">
    <AppAlert v-if="formErrorKey" variant="error">{{ t(formErrorKey) }}</AppAlert>

    <AppTextField
      v-model="email"
      :label="t('auth.email')"
      type="email"
      inputmode="email"
      autocomplete="email"
      required
      :error="emailError ? t(emailError) : ''"
      :disabled="isSubmitting"
      @blur="onEmailBlur"
    />
    <AppTextField
      v-model="phone"
      :label="t('auth.phone')"
      type="tel"
      inputmode="tel"
      autocomplete="tel"
      required
      :error="phoneError ? t(phoneError) : ''"
      :disabled="isSubmitting"
      @blur="onPhoneBlur"
    />
    <AppPasswordField
      v-model="password"
      :label="t('auth.password')"
      autocomplete="new-password"
      required
      :hint="t('auth.password_hint')"
      :error="passwordError ? t(passwordError) : ''"
      :disabled="isSubmitting"
      @blur="onPasswordBlur"
    />

    <EimzoKeyPicker v-model="selectedKey" name="register-eimzo-key" :disabled="isSubmitting">
      <AppButton
        type="submit"
        block
        :loading="isSubmitting"
        :disabled="selectedKey === null || !meta.valid"
      >
        {{ t('auth.register_submit') }}
      </AppButton>
    </EimzoKeyPicker>
  </form>
</template>

<style scoped>
.eimzo-register {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
