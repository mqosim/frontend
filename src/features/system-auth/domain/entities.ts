import type { Principal } from '@/shared/domain'

export interface SystemLoginInput {
  readonly email: string
  readonly password: string
}

/**
 * The outcome of the password step (step 1 of 2).
 *
 * The pre-authentication token is deliberately absent: it lives inside the
 * infrastructure repository and only ever travels in the `X-System-Pre-Auth`
 * request header, so no application or presentation code can read, store or log
 * it. `totpEnrolled` is the only decision the UI needs — false means the account
 * must enroll before it can open a session.
 */
export interface SystemLoginChallenge {
  readonly totpEnrolled: boolean
}

/** Shown exactly once: the secret to add to an authenticator app. */
export interface SystemTotpEnrollment {
  readonly secret: string
  readonly otpauthUri: string
}

/** Shown exactly once: the single-use recovery codes issued on activation. */
export interface SystemRecoveryCodes {
  readonly codes: readonly string[]
}

/** A complete SYSTEM session (never pending: SYSTEM has no workspace step). */
export interface SystemSession {
  readonly principal: Principal
}
