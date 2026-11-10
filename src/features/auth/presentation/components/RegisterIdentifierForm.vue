<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useI18n } from 'vue-i18n'

import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import AppTextField from '@/shared/presentation/components/AppTextField.vue'
import { useFocusFirstError } from '@/shared/presentation/composables/useFocusFirstError'
import { useFormField } from '@/shared/presentation/composables/useFormField'

import { registerStartSchema, toLoginIdentifier, type RegisterStartFormValues } from '../schemas'

/**
 * Step 1 of password+OTP registration: the email or phone to verify. The parent
 * owns the API call and the pending registration; this form only validates the
 * identifier and hands the normalised value back.
 */
const props = defineProps<{
  /** Prefilled when the user returns from the code step. */
  initialIdentifier: string
  /** An i18n key for a start failure, chosen by the parent from the error kind. */
  serverErrorKey: string
  submit: (identifier: string) => Promise<void>
}>()

const { t } = useI18n()
const { focusFirstError } = useFocusFirstError()

const { handleSubmit, isSubmitting } = useForm<RegisterStartFormValues>({
  validationSchema: toTypedSchema(registerStartSchema),
  initialValues: { identifier: props.initialIdentifier },
})

const {
  value: identifier,
  error: identifierError,
  blur: onIdentifierBlur,
} = useFormField<string>('identifier')

const onSubmit = handleSubmit(
  async (formValues) => {
    await props.submit(toLoginIdentifier(formValues.identifier).identifier)
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
      v-model="identifier"
      :label="t('auth.identifier')"
      type="text"
      autocomplete="username"
      required
      :error="identifierError ? t(identifierError) : ''"
      :disabled="isSubmitting"
      @blur="onIdentifierBlur"
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
