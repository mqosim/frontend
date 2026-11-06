import type { SessionContext } from '../session/sessionRuntime'

/** Inactivity limits for one authentication context. */
export interface IdlePolicy {
  /** Inactivity after which the warning dialog appears. */
  readonly warnAfterMs: number
  /** The warning countdown; the session ends when it elapses. */
  readonly countdownMs: number
}

export type IdlePolicies = Readonly<Record<SessionContext, IdlePolicy>>

const MINUTE = 60_000

/** Product defaults: PERSON/ORG warn at 20 min, SYSTEM at 10 min, 60 s to react. */
export const IDLE_DEFAULTS: IdlePolicies = {
  regular: { warnAfterMs: 20 * MINUTE, countdownMs: MINUTE },
  system: { warnAfterMs: 10 * MINUTE, countdownMs: MINUTE },
}

const readMs = (raw: string | undefined, fallback: number): number => {
  if (typeof raw !== 'string' || raw.length === 0) return fallback
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

/**
 * Reads the (optional) `VITE_IDLE_*` overrides. They exist mainly so the timeout
 * can be shortened during QA; production keeps the defaults above.
 */
export const readIdlePolicies = (): IdlePolicies => {
  const env = import.meta.env
  const countdownMs = readMs(env.VITE_IDLE_COUNTDOWN_MS, IDLE_DEFAULTS.regular.countdownMs)
  return {
    regular: {
      warnAfterMs: readMs(env.VITE_IDLE_WARN_MS_REGULAR, IDLE_DEFAULTS.regular.warnAfterMs),
      countdownMs,
    },
    system: {
      warnAfterMs: readMs(env.VITE_IDLE_WARN_MS_SYSTEM, IDLE_DEFAULTS.system.warnAfterMs),
      countdownMs,
    },
  }
}
