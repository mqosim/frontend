<script setup lang="ts">
import { watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useI18n } from 'vue-i18n'

import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import AppTextField from '@/shared/presentation/components/AppTextField.vue'
import { useFocusFirstError } from '@/shared/presentation/composables/useFocusFirstError'
import { useFormField } from '@/shared/presentation/composables/useFormField'

import { normalizePhone, registerStartSchema, type RegisterStartFormValues } from '../schemas'
import type { RegisterStartFieldErrors } from '../registrationErrors'

/**
 * Step 1 of password+OTP registration: the email that receives the code and the
 * phone number stored with the account. The parent owns the API call and the
 * pending registration; this form only validates the two fields and hands the
 * normalised values back.
 */
const props = defineProps<{
  /** Prefilled when the user returns from the code step. */
  initialEmail: string
  initialPhone: string
  /** An i18n key for a start failure, chosen by the parent from the error kind. */
  serverErrorKey: string
  /** Field-level 409 keys, chosen by the parent from the error's problems. */
  fieldErrors: RegisterStartFieldErrors
  submit: (values: RegisterStartFormValues) => Promise<void>
}>()

const { t } = useI18n()
const { focusFirstError } = useFocusFirstError()

const { handleSubmit, isSubmitting, setFieldError } = useForm<RegisterStartFormValues>({
  validationSchema: toTypedSchema(registerStartSchema),
  initialValues: { email: props.initialEmail, phone: props.initialPhone },
})

const { value: email, error: emailError, blur: onEmailBlur } = useFormField<string>('email')
const { value: phone, error: phoneError, blur: onPhoneBlur } = useFormField<string>('phone')

// The parent resolves the 409 problems into keys; vee-validate owns the display
// and hides the message until the user has interacted or submitted.
watch(
  () => props.fieldErrors,
  (fieldErrors) => {
    setFieldError('email', fieldErrors.email)
    setFieldError('phone', fieldErrors.phone)
  },
  { deep: true, immediate: true },
)

const onSubmit = handleSubmit(
  async (formValues) => {
    await props.submit({
      email: formValues.email,
      phone: normalizePhone(formValues.phone),
    })
  },
  ({ errors: validationErrors }) => {
    if (Object.keys(validationErrors).length > 0) void focusFirstError()
  },
)
</script>

<template>
  <form class="register-form" novalidate @submit="onSubmit">
    <AppAlert v-if="serverErrorKey" variant="error">{{ t(serverErrorKey) }}</AppAlert>

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

    <AppButton type="submit" block :loading="isSubmitting">
      {{ t('auth.register_send_code') }}
    </AppButton>
  </form>
</template>

<style scoped>
.register-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
