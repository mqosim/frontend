<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
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

import { useSystemAuthUseCases } from '../composables/useSystemAuthUseCases'
import { systemLoginSchema, type SystemLoginFormValues } from '../schemas'
import { useSystemSessionStore } from '../stores/sessionStore'

const { t } = useI18n()
const router = useRouter()
const auth = useSystemAuthUseCases()
const session = useSystemSessionStore()
const { focusFirstError } = useFocusFirstError()

const formErrorKey = ref('')

const { handleSubmit, isSubmitting } = useForm<SystemLoginFormValues>({
  validationSchema: toTypedSchema(systemLoginSchema),
  initialValues: { email: '', password: '' },
})

const { value: email, error: emailError, blur: onEmailBlur } = useFormField<string>('email')
const {
  value: password,
  error: passwordError,
  blur: onPasswordBlur,
} = useFormField<string>('password')

const onSubmit = handleSubmit(
  async (formValues) => {
    formErrorKey.value = ''
    const result = await auth.login({ email: formValues.email, password: formValues.password })
    if (!result.ok) {
      formErrorKey.value = credentialErrorMessageKey(result.error)
      return
    }
    session.setAuthenticated(result.value.principal)
    void router.push({ name: 'system-dashboard' })
  },
  ({ errors: validationErrors }) => {
    if (Object.keys(validationErrors).length > 0) void focusFirstError()
  },
)
</script>

<template>
  <section class="system-view">
    <header class="system-view__header">
      <p class="system-view__eyebrow">{{ t('system.badge') }}</p>
      <h1 class="system-view__title">{{ t('system.login_title') }}</h1>
      <p class="system-view__subtitle">{{ t('system.login_subtitle') }}</p>
    </header>

    <form class="system-view__form" novalidate @submit="onSubmit">
      <AppAlert v-if="formErrorKey" variant="error">{{ t(formErrorKey) }}</AppAlert>

      <AppTextField
        v-model="email"
        :label="t('system.email')"
        type="email"
        inputmode="email"
        autocomplete="username"
        required
        :error="emailError ? t(emailError) : ''"
        :disabled="isSubmitting"
        @blur="onEmailBlur"
      />
      <AppPasswordField
        v-model="password"
        :label="t('system.password')"
        autocomplete="current-password"
        required
        :error="passwordError ? t(passwordError) : ''"
        :disabled="isSubmitting"
        @blur="onPasswordBlur"
      />

      <AppButton type="submit" block :loading="isSubmitting">
        {{ t('system.login_submit') }}
      </AppButton>
    </form>

    <p class="system-view__footer">
      <RouterLink :to="{ name: 'landing' }">{{ t('system.back_to_app') }}</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.system-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.system-view__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.system-view__eyebrow {
  font-size: var(--font-size-sm);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-warning);
}

.system-view__title {
  font-size: var(--font-size-xl);
}

.system-view__subtitle {
  color: var(--color-text-muted);
}

.system-view__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.system-view__footer {
  font-size: var(--font-size-sm);
}
</style>
