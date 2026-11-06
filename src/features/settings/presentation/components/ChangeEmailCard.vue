<script setup lang="ts">
import { computed, ref } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useI18n } from 'vue-i18n'

import { useAuthUseCases } from '@/features/auth'
import type { UserProfile } from '@/shared/domain'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import { useFocusFirstError } from '@/shared/presentation/composables/useFocusFirstError'
import { useFormField } from '@/shared/presentation/composables/useFormField'
import { errorMessageKey } from '@/shared/presentation/errors/messages'

import SecurityCard from './SecurityCard.vue'
import SettingsButton from './SettingsButton.vue'
import SettingsField from './SettingsField.vue'
import { changeEmailSchema, emailCodeSchema, EMAIL_CODE_PATTERN } from '../schemas'

/**
 * The email-change flow: step 1 verifies the current password and asks the
 * backend to deliver a code to the new address; step 2 confirms the change
 * with that code. The backend owns every rule (uniqueness, cooldowns, caps),
 * so API failures are mapped by error kind — never by backend text.
 */
const props = defineProps<{
  currentEmail: string | null
}>()

const emit = defineEmits<{ updated: [profile: UserProfile] }>()

const { t } = useI18n()
const auth = useAuthUseCases()
const { focusFirstError } = useFocusFirstError()

const step = ref<'form' | 'code'>('form')
const pending = ref<{ expiresInSec: number; resendAfterSec: number } | null>(null)
const formErrorKey = ref('')
const successKey = ref('')
const codeErrorKey = ref('')
const confirming = ref(false)

// Recomputed so the "must differ" check follows the account's real address
// after a confirmed change (the prop updates when the parent refreshes).
const step1Schema = computed(() => toTypedSchema(changeEmailSchema(props.currentEmail)))

const { handleSubmit, isSubmitting, setFieldError, resetForm } = useForm({
  validationSchema: step1Schema,
  initialValues: { newEmail: '', currentPassword: '' },
})

const {
  value: newEmail,
  error: newEmailError,
  blur: onNewEmailBlur,
} = useFormField<string>('newEmail')
const {
  value: currentPassword,
  error: currentPasswordError,
  blur: onCurrentPasswordBlur,
} = useFormField<string>('currentPassword')

const code = ref('')

/** How the code announcement renders: which inbox and how long it lasts. */
const codeInfo = computed(() => {
  if (pending.value === null) return null
  return {
    email: newEmail.value,
    minutes: Math.max(1, Math.ceil(pending.value.expiresInSec / 60)),
  }
})

// Cancel clears only this card's form and validation state, never the
// password card's.
const onCancel = (): void => {
  formErrorKey.value = ''
  successKey.value = ''
  resetForm()
}

const onSubmitStep1 = handleSubmit(
  async (values) => {
    formErrorKey.value = ''
    successKey.value = ''
    const result = await auth.requestEmailChange({
      newEmail: values.newEmail,
      currentPassword: values.currentPassword,
    })
    if (!result.ok) {
      const error = result.error
      // 401 means the current password was rejected; the client's single
      // refresh-and-retry has already ruled out a merely expired access token.
      if (error.kind === 'Unauthorized') {
        setFieldError('currentPassword', 'settings.wrong_current_password')
        return
      }
      if (error.kind === 'Validation') {
        // Field names are structural, never the backend's message text.
        if ('new_email' in error.fields) setFieldError('newEmail', 'validation.email')
        else if ('current_password' in error.fields)
          setFieldError('currentPassword', 'validation.required')
        else formErrorKey.value = 'settings.email_same'
        return
      }
      if (error.kind === 'Conflict') {
        formErrorKey.value = 'settings.email_taken'
        return
      }
      if (error.kind === 'Unknown' && error.status === 500) {
        // The backend answers 500 only when the code email could not be sent,
        // so the request never pretends a code is on its way.
        formErrorKey.value = 'settings.email_send_failed'
        return
      }
      formErrorKey.value = errorMessageKey(error)
      return
    }

    pending.value = result.value
    // The password did its job; drop it from memory before the code step.
    currentPassword.value = ''
    step.value = 'code'
  },
  () => void focusFirstError(),
)

const onSubmitCode = async (event: Event): Promise<void> => {
  event.preventDefault()
  codeErrorKey.value = ''
  const parsed = emailCodeSchema.safeParse({ code: code.value })
  if (!parsed.success || !EMAIL_CODE_PATTERN.test(parsed.data.code)) {
    codeErrorKey.value = 'settings.code_invalid'
    void focusFirstError()
    return
  }

  confirming.value = true
  const result = await auth.confirmEmailChange({ code: parsed.data.code })
  confirming.value = false
  if (!result.ok) {
    const error = result.error
    // Wrong code, expired code, exhausted attempts and no pending change all
    // arrive as the same 400 (the backend never answers 401 here).
    if (error.kind === 'Validation') {
      codeErrorKey.value = 'settings.code_invalid'
      return
    }
    if (error.kind === 'Conflict') {
      // The address was claimed between request and confirm; the pending
      // change is consumed, so the user starts over with a fresh request.
      formErrorKey.value = 'settings.email_taken'
      step.value = 'form'
      return
    }
    formErrorKey.value = errorMessageKey(error)
    return
  }

  emit('updated', result.value)
  successKey.value = 'settings.email_changed'
  pending.value = null
  code.value = ''
  newEmail.value = ''
  step.value = 'form'
}

const backToForm = (): void => {
  codeErrorKey.value = ''
  code.value = ''
  step.value = 'form'
}
</script>

<template>
  <SecurityCard :title="t('settings.change_email_title')" :hint="t('settings.email_card_hint')">
    <template #icon>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    </template>

    <AppAlert v-if="successKey" variant="info">{{ t(successKey) }}</AppAlert>

    <form v-if="step === 'form'" class="ecard__form" novalidate @submit="onSubmitStep1">
      <AppAlert v-if="formErrorKey" variant="error">{{ t(formErrorKey) }}</AppAlert>

      <div class="ecard__grid">
        <SettingsField
          v-model="currentPassword"
          :label="t('settings.current_password')"
          type="password"
          toggleable
          autocomplete="current-password"
          :error="currentPasswordError ? t(currentPasswordError) : ''"
          :disabled="isSubmitting"
          @blur="onCurrentPasswordBlur"
        />
        <SettingsField
          v-model="newEmail"
          :label="t('settings.new_email')"
          type="text"
          inputmode="email"
          autocomplete="email"
          placeholder="yusuf@example.com"
          :error="newEmailError ? t(newEmailError) : ''"
          :disabled="isSubmitting"
          @blur="onNewEmailBlur"
        />
      </div>

      <p class="ecard__banner">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span>{{ t('settings.email_banner') }}</span>
      </p>

      <div class="ecard__actions">
        <SettingsButton variant="secondary" :disabled="isSubmitting" @click="onCancel">
          {{ t('action.cancel') }}
        </SettingsButton>
        <SettingsButton type="submit" :loading="isSubmitting">
          {{ t('settings.email_submit') }}
        </SettingsButton>
      </div>
    </form>

    <form v-else class="ecard__form" novalidate @submit="onSubmitCode">
      <p v-if="codeInfo !== null" class="ecard__banner">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span>{{
          t('settings.code_sent', { email: codeInfo.email, minutes: codeInfo.minutes })
        }}</span>
      </p>
      <AppAlert v-if="formErrorKey" variant="error">{{ t(formErrorKey) }}</AppAlert>

      <div class="ecard__grid">
        <SettingsField
          v-model="code"
          :label="t('settings.verification_code')"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          :error="codeErrorKey ? t(codeErrorKey) : ''"
          :disabled="confirming"
        />
      </div>

      <div class="ecard__actions">
        <SettingsButton variant="secondary" :disabled="confirming" @click="backToForm">
          {{ t('action.cancel') }}
        </SettingsButton>
        <SettingsButton type="submit" :loading="confirming">
          {{ t('settings.confirm_email') }}
        </SettingsButton>
      </div>
    </form>
  </SecurityCard>
</template>

<style scoped>
.ecard__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

/* The two-column field grid shared with the password card, so both cards align
   their fields to the same boundaries. */
.ecard__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 23px;
  row-gap: 16px;
  align-items: start;
}

.ecard__banner {
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  min-height: 47px;
  margin: 0;
  padding: 8px 13px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background-color: var(--color-info-surface);
  font-size: 12px;
  color: var(--color-primary);
}

.ecard__banner svg {
  flex: none;
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ecard__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 18px;
}

@media (max-width: 47.99rem) {
  .ecard__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .ecard__actions {
    flex-direction: column-reverse;
  }

  .ecard__actions > * {
    width: 100%;
  }
}
</style>
