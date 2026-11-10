<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

import { getCurrentLocale, toApiLang } from '@/features/i18n'
import { registerErrorMessageKey } from '@/shared/presentation/errors/messages'

import type { RegisterPending } from '../../domain/entities'
import type { RegisterCompleteFormValues, RegisterStartFormValues } from '../schemas'
import { useAuthOutcome } from '../composables/useAuthOutcome'
import { useAuthUseCases } from '../composables/useAuthUseCases'
import { toRegisterStartFieldErrors, type RegisterStartFieldErrors } from '../registrationErrors'
import RegisterIdentifierForm from './RegisterIdentifierForm.vue'
import RegisterVerifyForm from './RegisterVerifyForm.vue'

/**
 * Password+OTP registration host: step 1 sends a code, step 2 verifies it and
 * creates the account. The host owns the pending registration, the countdowns
 * and the error key; the two forms own their own vee-validate contexts (two
 * `useForm` calls in one component would overwrite each other's form context).
 */
const auth = useAuthUseCases()
const { applyOutcome } = useAuthOutcome()

const step = ref<'identifier' | 'verify'>('identifier')
const email = ref('')
const phone = ref('')
const pending = ref<RegisterPending | null>(null)
const formErrorKey = ref('')
const fieldErrors = ref<RegisterStartFieldErrors>({})
const isResending = ref(false)

// Deadlines are absolute wall-clock timestamps, so the countdowns stay correct
// even when the tab throttles the interval.
const now = ref(Date.now())
const expiresAt = ref(0)
const resendAt = ref(0)

let timerId: number | null = null

const stopTimer = (): void => {
  if (timerId !== null) {
    window.clearInterval(timerId)
    timerId = null
  }
}

const startTimer = (): void => {
  stopTimer()
  now.value = Date.now()
  timerId = window.setInterval(() => {
    now.value = Date.now()
  }, 1000)
}

// Only the code step needs a ticking clock.
watch(
  step,
  (value) => {
    if (value === 'verify') startTimer()
    else stopTimer()
  },
  { immediate: true },
)

onUnmounted(stopTimer)

const secondsUntil = (deadline: number): number =>
  deadline === 0 ? 0 : Math.max(0, Math.ceil((deadline - now.value) / 1000))

const expiresInSeconds = computed(() => secondsUntil(expiresAt.value))
const resendInSeconds = computed(() => secondsUntil(resendAt.value))
const canResend = computed(
  () => step.value === 'verify' && resendInSeconds.value === 0 && !isResending.value,
)

/** The contract's optional OTP-locale header, in canonical BCP 47 form. */
const otpLocale = (): string => toApiLang(getCurrentLocale())

const applyPending = (value: RegisterPending): void => {
  pending.value = value
  const nowMs = Date.now()
  now.value = nowMs
  expiresAt.value = nowMs + value.expiresInSec * 1000
  resendAt.value = nowMs + value.resendAfterSec * 1000
}

const submitIdentifier = async (values: RegisterStartFormValues): Promise<void> => {
  formErrorKey.value = ''
  fieldErrors.value = {}
  const result = await auth.registerStart({
    email: values.email,
    phone: values.phone,
    otpLocale: otpLocale(),
  })
  if (!result.ok) {
    const fieldErrorKeys = toRegisterStartFieldErrors(result.error)
    if (Object.keys(fieldErrorKeys).length > 0) {
      fieldErrors.value = fieldErrorKeys
      return
    }
    formErrorKey.value = registerErrorMessageKey(result.error)
    return
  }
  email.value = values.email
  phone.value = values.phone
  applyPending(result.value)
  step.value = 'verify'
}

const resend = async (): Promise<void> => {
  if (!canResend.value) return
  formErrorKey.value = ''
  isResending.value = true
  const result = await auth.registerStart({
    email: email.value,
    phone: phone.value,
    otpLocale: otpLocale(),
  })
  isResending.value = false
  if (!result.ok) {
    formErrorKey.value = registerErrorMessageKey(result.error)
    // A rate limit may carry a concrete wait; otherwise the next attempt is
    // allowed immediately and the server stays the source of truth.
    if (result.error.kind === 'RateLimited' && result.error.retryAfterMs !== null) {
      resendAt.value = Date.now() + result.error.retryAfterMs
    }
    return
  }
  // The restart replaces the pending registration and its timers.
  applyPending(result.value)
}

const submitComplete = async (values: RegisterCompleteFormValues): Promise<boolean> => {
  const current = pending.value
  if (current === null) {
    formErrorKey.value = 'errors.generic'
    return false
  }
  formErrorKey.value = ''
  const result = await auth.registerComplete({
    pendingId: current.pendingId,
    code: values.code,
    password: values.password,
    fullName: values.fullName,
    otpLocale: otpLocale(),
  })
  if (!result.ok) {
    formErrorKey.value = registerErrorMessageKey(result.error)
    return false
  }
  // Drop the pending registration and its deadlines before leaving the page.
  pending.value = null
  email.value = ''
  phone.value = ''
  fieldErrors.value = {}
  expiresAt.value = 0
  resendAt.value = 0
  // Same session adoption and redirect as password login.
  applyOutcome(result.value)
  return true
}

const changeIdentifier = (): void => {
  formErrorKey.value = ''
  fieldErrors.value = {}
  pending.value = null
  expiresAt.value = 0
  resendAt.value = 0
  step.value = 'identifier'
}
</script>

<template>
  <div class="password-register">
    <RegisterIdentifierForm
      v-if="step === 'identifier'"
      :initial-email="email"
      :initial-phone="phone"
      :server-error-key="formErrorKey"
      :field-errors="fieldErrors"
      :submit="submitIdentifier"
    />
    <RegisterVerifyForm
      v-else
      :email="email"
      :expires-in-seconds="expiresInSeconds"
      :resend-in-seconds="resendInSeconds"
      :can-resend="canResend"
      :is-resending="isResending"
      :server-error-key="formErrorKey"
      :submit="submitComplete"
      :resend="resend"
      :change-identifier="changeIdentifier"
    />
  </div>
</template>

<style scoped>
.password-register {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
