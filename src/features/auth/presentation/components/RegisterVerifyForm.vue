<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useI18n } from 'vue-i18n'

import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import AppPasswordField from '@/shared/presentation/components/AppPasswordField.vue'
import AppTextField from '@/shared/presentation/components/AppTextField.vue'
import { useFocusFirstError } from '@/shared/presentation/composables/useFocusFirstError'
import { useFormField } from '@/shared/presentation/composables/useFormField'

import {
  normalizeFullName,
  registerCompleteSchema,
  type RegisterCompleteFormValues,
} from '../schemas'

/**
 * Step 2 of password+OTP registration: the delivered code, the new password and
 * the full name. The parent owns the API call, the pending registration and the
 * countdowns; this form validates the input and reports a successful completion
 * so it can clear the sensitive fields from its own state.
 */
const props = defineProps<{
  /** The email the code was sent to, for the announcement. */
  email: string
  expiresInSeconds: number
  resendInSeconds: number
  canResend: boolean
  isResending: boolean
  /** An i18n key for a completion/resend failure, chosen by the parent. */
  serverErrorKey: string
  submit: (values: RegisterCompleteFormValues) => Promise<boolean>
  resend: () => Promise<void>
  changeIdentifier: () => void
}>()

const { t } = useI18n()
const { focusFirstError } = useFocusFirstError()

const { handleSubmit, isSubmitting, resetForm } = useForm<RegisterCompleteFormValues>({
  validationSchema: toTypedSchema(registerCompleteSchema),
  initialValues: { code: '', password: '', fullName: '' },
})

const { value: code, error: codeError, blur: onCodeBlur } = useFormField<string>('code')
const {
  value: password,
  error: passwordError,
  blur: onPasswordBlur,
} = useFormField<string>('password')
const {
  value: fullName,
  error: fullNameError,
  blur: onFullNameBlur,
} = useFormField<string>('fullName')

const onSubmit = handleSubmit(
  async (formValues) => {
    const succeeded = await props.submit({
      code: formValues.code,
      password: formValues.password,
      fullName: normalizeFullName(formValues.fullName),
    })
    // The account exists now; never keep the OTP, password or name in state.
    if (succeeded) resetForm()
  },
  ({ errors: validationErrors }) => {
    if (Object.keys(validationErrors).length > 0) void focusFirstError()
  },
)
</script>

<template>
  <form class="register-form" novalidate @submit="onSubmit">
    <header class="register-form__header">
      <h2 class="register-form__title">{{ t('auth.otp_title') }}</h2>
      <p class="register-form__subtitle">
        {{ t('auth.otp_subtitle', { identifier: email }) }}
      </p>
    </header>

    <p v-if="expiresInSeconds > 0" class="register-form__timer">
      {{ t('auth.otp_expires_in', { seconds: expiresInSeconds }) }}
    </p>

    <AppAlert v-if="serverErrorKey" variant="error">{{ t(serverErrorKey) }}</AppAlert>

    <AppTextField
      v-model="code"
      :label="t('auth.otp_code')"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      required
      :error="codeError ? t(codeError) : ''"
      :disabled="isSubmitting"
      @blur="onCodeBlur"
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
    <AppTextField
      v-model="fullName"
      :label="t('auth.full_name')"
      type="text"
      autocomplete="name"
      required
      :error="fullNameError ? t(fullNameError) : ''"
      :disabled="isSubmitting"
      @blur="onFullNameBlur"
    />

    <AppButton type="submit" block :loading="isSubmitting">
      {{ t('auth.register_submit') }}
    </AppButton>

    <div class="register-form__actions">
      <AppButton
        type="button"
        variant="ghost"
        :disabled="isSubmitting || !canResend"
        :loading="isResending"
        @click="resend"
      >
        {{
          resendInSeconds > 0
            ? t('auth.otp_resend_in', { seconds: resendInSeconds })
            : t('auth.otp_resend')
        }}
      </AppButton>
      <AppButton
        type="button"
        variant="ghost"
        :disabled="isSubmitting || isResending"
        @click="changeIdentifier"
      >
        {{ t('auth.otp_change_identifier') }}
      </AppButton>
    </div>
  </form>
</template>

<style scoped>
.register-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.register-form__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.register-form__title {
  font-size: var(--font-size-lg);
}

.register-form__subtitle,
.register-form__timer {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.register-form__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-2);
}
</style>
