<script setup lang="ts">
import { computed, ref } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useI18n } from 'vue-i18n'

import { useAuthUseCases } from '@/features/auth'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import { useFocusFirstError } from '@/shared/presentation/composables/useFocusFirstError'
import { useFormField } from '@/shared/presentation/composables/useFormField'
import { errorMessageKey } from '@/shared/presentation/errors/messages'

import SecurityCard from './SecurityCard.vue'
import SettingsButton from './SettingsButton.vue'
import SettingsField from './SettingsField.vue'
import { changePasswordSchema } from '../schemas'

/**
 * Password change. The backend verifies the current password against bcrypt,
 * enforces the 8–72 byte policy and revokes every other refresh-token family;
 * this caller's own session survives via the refresh cookie, so no local
 * session action is needed on success.
 */
const { t } = useI18n()
const auth = useAuthUseCases()
const { focusFirstError } = useFocusFirstError()

const formErrorKey = ref('')
const successKey = ref(false)

const { handleSubmit, isSubmitting, setFieldError, resetForm } = useForm({
  validationSchema: toTypedSchema(changePasswordSchema),
  initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
})

const {
  value: currentPassword,
  error: currentPasswordError,
  blur: onCurrentPasswordBlur,
} = useFormField<string>('currentPassword')
const {
  value: newPassword,
  error: newPasswordError,
  blur: onNewPasswordBlur,
} = useFormField<string>('newPassword')
const {
  value: confirmPassword,
  error: confirmPasswordError,
  blur: onConfirmPasswordBlur,
} = useFormField<string>('confirmPassword')

// Live strength indicators for the new password, recomputed from the field —
// never a hardcoded "all satisfied" state. The backend's enforced policy is only
// the 8–72 length; the character-class rows are additional client-side guidance.
const requirements = computed(() => [
  { key: 'settings.req_length', met: newPassword.value.length >= 8 },
  { key: 'settings.req_number', met: /[0-9]/.test(newPassword.value) },
  { key: 'settings.req_lowercase', met: /[a-z]/.test(newPassword.value) },
  { key: 'settings.req_uppercase', met: /[A-Z]/.test(newPassword.value) },
])

// Cancel clears only this card's form and validation state, never the
// email card's.
const onCancel = (): void => {
  formErrorKey.value = ''
  successKey.value = false
  resetForm()
}

const onSubmit = handleSubmit(
  async (values) => {
    formErrorKey.value = ''
    successKey.value = false
    const result = await auth.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
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
        // Field names are structural, never the backend's message text; a 400
        // without fields is the "must differ" sentinel.
        if ('new_password' in error.fields)
          setFieldError('newPassword', 'validation.password_length')
        else if ('current_password' in error.fields)
          setFieldError('currentPassword', 'validation.required')
        else formErrorKey.value = 'settings.password_same'
        return
      }
      if (error.kind === 'Conflict') {
        // 409 from this endpoint means the account has no password at all
        // (an E-IMZO-only account), which self-registered accounts never hit.
        formErrorKey.value = 'settings.no_password_set'
        return
      }
      formErrorKey.value = errorMessageKey(error)
      return
    }

    // Success: clear every sensitive field so the passwords never linger in
    // the DOM/state (they were never persisted anywhere).
    resetForm()
    successKey.value = true
  },
  () => void focusFirstError(),
)
</script>

<template>
  <SecurityCard
    :title="t('settings.change_password_title')"
    :hint="t('settings.password_card_hint')"
  >
    <template #icon>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="16" r="1" />
        <rect x="3" y="10" width="18" height="12" rx="2" />
        <path d="M7 10V7a5 5 0 0 1 10 0v3" />
      </svg>
    </template>

    <AppAlert v-if="successKey" variant="info">{{ t('settings.password_changed') }}</AppAlert>

    <form class="pcard__form" novalidate @submit="onSubmit">
      <AppAlert v-if="formErrorKey" variant="error">{{ t(formErrorKey) }}</AppAlert>

      <div class="pcard__grid">
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

        <div class="pcard__stack">
          <SettingsField
            v-model="newPassword"
            :label="t('settings.new_password')"
            type="password"
            toggleable
            autocomplete="new-password"
            :error="newPasswordError ? t(newPasswordError) : ''"
            :disabled="isSubmitting"
            @blur="onNewPasswordBlur"
          />

          <ul class="pcard__reqs">
            <li
              v-for="requirement in requirements"
              :key="requirement.key"
              class="pcard__req"
              :class="{ 'pcard__req--met': requirement.met }"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span>{{ t(requirement.key) }}</span>
            </li>
          </ul>
        </div>

        <SettingsField
          v-model="confirmPassword"
          :label="t('settings.confirm_new_password')"
          type="password"
          toggleable
          autocomplete="new-password"
          :error="confirmPasswordError ? t(confirmPasswordError) : ''"
          :disabled="isSubmitting"
          @blur="onConfirmPasswordBlur"
        />
      </div>

      <div class="pcard__actions">
        <SettingsButton variant="secondary" :disabled="isSubmitting" @click="onCancel">
          {{ t('action.cancel') }}
        </SettingsButton>
        <SettingsButton type="submit" :loading="isSubmitting">
          {{ t('settings.change_password_submit') }}
        </SettingsButton>
      </div>
    </form>
  </SecurityCard>
</template>

<style scoped>
.pcard__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 20px;
}

/* The two-column field grid shared with the email card. The third field lands
   in the left column of the second row, leaving the lower-right area open. */
.pcard__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 23px;
  row-gap: 18px;
  align-items: start;
}

.pcard__stack {
  display: flex;
  flex-direction: column;
}

.pcard__reqs {
  margin: 12px 0 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background-color: var(--color-info-surface);
  list-style: none;
}

.pcard__req {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: var(--color-text-muted);
}

/* Not a token: the single green the design reserves for satisfied password
   requirements (the only other literal is the notification dot). */
.pcard__req svg {
  flex: none;
  width: 13px;
  height: 13px;
  fill: none;
  stroke: var(--color-text-muted);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pcard__req--met svg {
  stroke: #35ad91;
}

.pcard__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 18px;
}

@media (max-width: 47.99rem) {
  .pcard__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .pcard__actions {
    flex-direction: column-reverse;
  }

  .pcard__actions > * {
    width: 100%;
  }
}
</style>
