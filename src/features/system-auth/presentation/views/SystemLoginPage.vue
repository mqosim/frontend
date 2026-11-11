<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useI18n } from 'vue-i18n'

import type { AppError } from '@/shared/domain'
import AppAlert from '@/shared/presentation/components/AppAlert.vue'
import AppButton from '@/shared/presentation/components/AppButton.vue'
import AppPasswordField from '@/shared/presentation/components/AppPasswordField.vue'
import AppTextField from '@/shared/presentation/components/AppTextField.vue'
import { useFocusFirstError } from '@/shared/presentation/composables/useFocusFirstError'
import { useFormField } from '@/shared/presentation/composables/useFormField'

import type { SystemTotpEnrollment } from '../../domain/entities'
import { useSystemAuthUseCases } from '../composables/useSystemAuthUseCases'
import { buildEnrollmentQr, type EnrollmentQr } from '../enrollmentQr'
import {
  systemLoginSchema,
  systemSecondFactorSchema,
  type SystemLoginFormValues,
} from '../schemas'
import { useSystemSessionStore } from '../stores/sessionStore'
import { isSystemAuthCode, systemAuthErrorKey } from '../systemAuthErrors'

/**
 * The SYSTEM sign-in, which the contract splits in two steps: the password is
 * only verified by `beginLogin` (it never opens a session), then the second
 * factor opens it. A first login must enroll before it can verify, so the flow
 * is: credentials → (enroll → activate → recovery codes) → totp → dashboard.
 *
 * The pre-authentication token never reaches this component: the repository
 * keeps it and attaches `X-System-Pre-Auth` itself. What the UI holds is only
 * the `totpEnrolled` flag and the one-time enrollment payload, which is cleared
 * as soon as the step ends.
 */
type LoginStep = 'credentials' | 'totp' | 'enroll' | 'activate' | 'recovery'

const { t } = useI18n()
const router = useRouter()
const auth = useSystemAuthUseCases()
const session = useSystemSessionStore()
const { focusFirstError } = useFocusFirstError()

const step = ref<LoginStep>('credentials')
const formErrorKey = ref('')
const flowPending = ref(false)
const enrollment = ref<SystemTotpEnrollment | null>(null)
const recoveryCodes = ref<readonly string[]>([])
const qr = ref<EnrollmentQr | null>(null)
// Guards a late dynamic-import result from writing state after the step ended.
let qrGeneration = 0

/** Drops the rendered QR and invalidates any in-flight generation. */
const resetQr = (): void => {
  qrGeneration += 1
  qr.value = null
}

/** Builds the QR for one enrollment payload; a late result is discarded. */
const showEnrollmentQr = async (payload: SystemTotpEnrollment): Promise<void> => {
  const generation = (qrGeneration += 1)
  const built = await buildEnrollmentQr(payload.otpauthUri)
  if (generation !== qrGeneration) return
  qr.value = built
  if (built === null && import.meta.env.DEV) {
    // Generic on purpose: the URI and secret must never reach the console.
    console.warn('[system-auth] QR generation failed; showing the text fallback.')
  }
}

// The second-factor field is a single non-empty string, so it is validated here
// instead of through a second vee-validate form: a component can only provide
// one form context, and the credentials form above already owns it.
const code = ref('')
const codeErrorKey = ref('')
const codeSubmitted = ref(false)

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

/** Returns to the password step and drops every trace of the attempt. */
const restart = (messageKey: string): void => {
  step.value = 'credentials'
  enrollment.value = null
  resetQr()
  recoveryCodes.value = []
  code.value = ''
  codeErrorKey.value = ''
  codeSubmitted.value = false
  formErrorKey.value = messageKey
}

/** Moves to a step with a clean inline-error state. */
const goTo = (next: LoginStep): void => {
  step.value = next
  formErrorKey.value = ''
  code.value = ''
  codeErrorKey.value = ''
  codeSubmitted.value = false
}

/**
 * A failed call either keeps the user on the second-factor step (a wrong code,
 * a rate limit, the network) or, when the pre-authentication token is spent,
 * sends them back to the password — the only state from which a new token can be
 * issued.
 */
const handleStepFailure = (error: AppError): void => {
  const key = systemAuthErrorKey(error)
  if (isSystemAuthCode(error, 'system_pre_auth_invalid')) restart(key)
  else formErrorKey.value = key
}

const onSubmit = handleSubmit(
  async (formValues) => {
    formErrorKey.value = ''
    const result = await auth.beginLogin({
      email: formValues.email,
      password: formValues.password,
    })
    if (!result.ok) {
      formErrorKey.value = systemAuthErrorKey(result.error)
      return
    }
    // A first login has nothing to verify yet: enroll, then confirm.
    if (result.value.totpEnrolled) goTo('totp')
    else await startEnrollment()
  },
  ({ errors: validationErrors }) => {
    if (Object.keys(validationErrors).length > 0) void focusFirstError()
  },
)

const startEnrollment = async (): Promise<void> => {
  goTo('enroll')
  flowPending.value = true
  const result = await auth.enrollTotp()
  flowPending.value = false
  if (!result.ok) {
    // The account was confirmed elsewhere while this attempt was in flight:
    // continue with the code step the user now needs.
    if (isSystemAuthCode(result.error, 'totp_already_enrolled')) {
      goTo('totp')
      return
    }
    // Nothing else can be done without a fresh pre-authentication token, and
    // the password step is the only place that issues one.
    restart(systemAuthErrorKey(result.error))
    return
  }
  enrollment.value = result.value
  void showEnrollmentQr(result.value)
}

const onFactorSubmit = async (): Promise<void> => {
  codeSubmitted.value = true
  codeErrorKey.value = ''
  formErrorKey.value = ''

  // The contract takes one `code` field (1..32 chars) for both a 6-digit TOTP
  // and a recovery code, so one schema covers every second-factor step.
  const parsed = systemSecondFactorSchema.safeParse({ code: code.value })
  if (!parsed.success) {
    codeErrorKey.value = parsed.error.issues[0]?.message ?? 'validation.required'
    return
  }
  const value = parsed.data.code

  flowPending.value = true
  if (step.value === 'activate') {
    const activated = await auth.activateTotp(value)
    flowPending.value = false
    if (!activated.ok) {
      // A missing pending secret cannot be retried with another code.
      if (isSystemAuthCode(activated.error, 'totp_not_enrolled')) {
        restart(systemAuthErrorKey(activated.error))
        return
      }
      if (isSystemAuthCode(activated.error, 'totp_already_enrolled')) {
        goTo('totp')
        return
      }
      handleStepFailure(activated.error)
      return
    }
    // Shown exactly once: the codes live in this component and nowhere else.
    goTo('recovery')
    recoveryCodes.value = activated.value.codes
    return
  }

  const result = await auth.verifyTotp(value)
  flowPending.value = false
  if (!result.ok) {
    handleStepFailure(result.error)
    return
  }
  session.setAuthenticated(result.value.principal)
  void router.push({ name: 'system-dashboard' })
}

const onCodeBlur = (): void => {
  if (codeSubmitted.value) return
  codeErrorKey.value = code.value.trim() === '' ? 'validation.required' : ''
}

const onEnrollmentReady = (): void => {
  enrollment.value = null
  resetQr()
  goTo('activate')
}

const onRecoveryAcknowledged = (): void => {
  recoveryCodes.value = []
  // The code that confirmed the enrollment is a replay from now on, so the user
  // must wait for the next one before the session can open.
  goTo('totp')
}

const onCancel = (): void => {
  restart('')
}

onBeforeUnmount(() => {
  // The one-time payloads must not outlive the screen.
  enrollment.value = null
  resetQr()
  recoveryCodes.value = []
})
</script>

<template>
  <section class="system-view">
    <header class="system-view__header">
      <p class="system-view__eyebrow">{{ t('system.badge') }}</p>
      <template v-if="step === 'credentials'">
        <h1 class="system-view__title">{{ t('system.login_title') }}</h1>
        <p class="system-view__subtitle">{{ t('system.login_subtitle') }}</p>
      </template>
      <template v-else-if="step === 'totp'">
        <h1 class="system-view__title">{{ t('system.totp_title') }}</h1>
        <p class="system-view__subtitle">{{ t('system.totp_subtitle') }}</p>
      </template>
      <template v-else-if="step === 'enroll'">
        <h1 class="system-view__title">{{ t('system.enroll_title') }}</h1>
        <p class="system-view__subtitle">{{ t('system.enroll_subtitle') }}</p>
      </template>
      <template v-else-if="step === 'activate'">
        <h1 class="system-view__title">{{ t('system.activate_title') }}</h1>
        <p class="system-view__subtitle">{{ t('system.activate_subtitle') }}</p>
      </template>
      <template v-else>
        <h1 class="system-view__title">{{ t('system.recovery_title') }}</h1>
        <p class="system-view__subtitle">{{ t('system.recovery_subtitle') }}</p>
      </template>
    </header>

    <AppAlert v-if="formErrorKey" variant="error">{{ t(formErrorKey) }}</AppAlert>

    <form v-if="step === 'credentials'" class="system-view__form" novalidate @submit="onSubmit">
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

    <form
      v-else-if="step === 'totp' || step === 'activate'"
      class="system-view__form"
      novalidate
      @submit.prevent="onFactorSubmit"
    >
      <AppTextField
        v-model="code"
        :label="t(step === 'activate' ? 'system.activate_code' : 'system.totp_code')"
        :inputmode="step === 'activate' ? 'numeric' : 'text'"
        autocomplete="one-time-code"
        required
        :error="codeSubmitted && codeErrorKey ? t(codeErrorKey) : ''"
        :disabled="flowPending"
        @blur="onCodeBlur"
      />
      <p v-if="step === 'totp'" class="system-view__hint">
        {{ t('system.totp_recovery_hint') }}
      </p>

      <AppButton type="submit" block :loading="flowPending">
        {{ t(step === 'activate' ? 'system.activate_submit' : 'system.totp_submit') }}
      </AppButton>
      <AppButton v-if="step === 'totp'" variant="ghost" :disabled="flowPending" @click="onCancel">
        {{ t('system.totp_back') }}
      </AppButton>
    </form>

    <div v-else-if="step === 'enroll'" class="system-view__form">
      <p v-if="enrollment === null" class="system-view__hint">{{ t('common.loading') }}</p>
      <template v-else>
        <div v-if="qr !== null" class="system-view__qr">
          <svg
            class="system-view__qr-svg"
            :viewBox="`0 0 ${qr.size} ${qr.size}`"
            role="img"
            :aria-label="t('system.enroll_qr_label')"
            shape-rendering="crispEdges"
            focusable="false"
          >
            <path :d="qr.path" fill="#000000" />
          </svg>
          <p class="system-view__hint">{{ t('system.enroll_qr_hint') }}</p>
        </div>
        <div class="system-view__secret">
          <p class="system-view__label">{{ t('system.enroll_secret') }}</p>
          <code class="system-view__code">{{ enrollment.secret }}</code>
        </div>
        <div class="system-view__secret">
          <p class="system-view__label">{{ t('system.enroll_uri') }}</p>
          <code class="system-view__code">{{ enrollment.otpauthUri }}</code>
        </div>
        <AppButton block :disabled="flowPending" @click="onEnrollmentReady">
          {{ t('system.enroll_continue') }}
        </AppButton>
      </template>
    </div>

    <div v-else class="system-view__form">
      <ul class="system-view__codes">
        <li v-for="recoveryCode in recoveryCodes" :key="recoveryCode">
          <code>{{ recoveryCode }}</code>
        </li>
      </ul>
      <AppAlert variant="info">{{ t('system.recovery_notice') }}</AppAlert>
      <p class="system-view__hint">{{ t('system.totp_next_code') }}</p>
      <AppButton block @click="onRecoveryAcknowledged">
        {{ t('system.recovery_continue') }}
      </AppButton>
    </div>

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

.system-view__hint {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* The QR is one SVG path (no canvas, no data URL) on an explicit white box, so
   the black modules keep their quiet zone and stay scannable in both themes. */
.system-view__qr {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.system-view__qr-svg {
  display: block;
  width: 220px;
  height: 220px;
  max-width: 100%;
  border-radius: var(--radius-sm);
  background-color: #ffffff;
}

.system-view__secret {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.system-view__label {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* The one-time values are selectable as a whole: the QR above is the quick path
   and these remain the manual fallback when scanning is not possible. */
.system-view__code {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  font-family: monospace;
  font-size: var(--font-size-sm);
  overflow-wrap: anywhere;
  user-select: all;
}

.system-view__codes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  max-height: 16rem;
  margin: 0;
  padding: var(--space-3);
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  list-style: none;
  font-family: monospace;
  font-size: var(--font-size-sm);
}

.system-view__codes code {
  user-select: all;
}

.system-view__footer {
  font-size: var(--font-size-sm);
}
</style>
