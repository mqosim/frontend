import { createContextChannel } from './contextChannel'
import type { ContextChannel } from './contextChannel'
import type { IdlePolicy } from '../config/idle'
import type { SessionContext } from './sessionRuntime'

export interface IdleRuntimeDeps {
  readonly context: SessionContext
  readonly policy: IdlePolicy
  /** Warning state for the UI: seconds left (>0) shows the dialog, `null` hides it. */
  readonly onWarning: (secondsLeft: number | null) => void
  /** A "stay signed in" check is running, so the dialog can show a busy state. */
  readonly onBusy: (busy: boolean) => void
  /** The countdown elapsed (or the user chose to log out now): end the session. */
  readonly onTimeout: () => void
  /** Confirms the session is still alive (a refresh via the locked single-flight). */
  readonly verifyAlive: () => Promise<boolean>
  /** Shares a local activity timestamp with the sibling tabs of this context. */
  readonly announceActivity: (at: number) => void
}

/**
 * Turns inactivity into a warning + logout, per authentication context.
 *
 * It is deliberately timestamp-based (`Date.now()` compared on a coarse tick)
 * rather than one long `setTimeout`: a laptop that slept, or a background tab
 * whose timers were throttled, recomputes the real elapsed time the instant it
 * becomes visible again instead of trusting a timer that may never have fired.
 *
 * Activity is shared across tabs of the same context: a sibling's activity resets
 * this tab's clock too. Only a bare timestamp is persisted (never a token).
 */
export interface IdleRuntime {
  /** Begins tracking (idempotent). Call when the context becomes authenticated. */
  start(): void
  /** Stops tracking and clears the warning (idempotent). Call on logout/anonymous. */
  stop(): void
  /** Records local user activity. */
  touch(): void
  /** Records activity reported by a sibling tab. */
  receiveActivity(at: number): void
  /** "Stay signed in": verify the session, then reset the clock. */
  stayAlive(): Promise<void>
}

/** The storage value is a bare timestamp only — never a token. */
const STORAGE_PREFIX = 'mfin.idle.'
/**
 * Pre-rename storage prefix. Read as a fallback so an existing activity
 * timestamp survives the rename; removed again on the next write.
 */
const LEGACY_STORAGE_PREFIX = '365d.idle.'
const TICK_MS = 1000
/** At most one cross-tab activity broadcast per this window. */
const ACTIVITY_BROADCAST_MS = 2000
const ACTIVITY_EVENTS: readonly string[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'wheel',
]

const tabId = Math.random().toString(36).slice(2)

export const createIdleRuntime = ({
  context,
  policy,
  onWarning,
  onBusy,
  onTimeout,
  verifyAlive,
  announceActivity,
}: IdleRuntimeDeps): IdleRuntime => {
  const storageKey = `${STORAGE_PREFIX}${context}`
  const legacyStorageKey = `${LEGACY_STORAGE_PREFIX}${context}`
  const timeoutAt = policy.warnAfterMs + policy.countdownMs

  let channel: ContextChannel | null = null
  let interval: ReturnType<typeof setInterval> | null = null
  let lastActivityAt = 0
  let lastBroadcastAt = 0
  let running = false
  let showing = false
  let checking = false

  const readStored = (): number => {
    try {
      const raw =
        window.localStorage.getItem(storageKey) ?? window.localStorage.getItem(legacyStorageKey)
      if (raw === null) return 0
      const value = Number(raw)
      return Number.isFinite(value) ? value : 0
    } catch {
      return 0
    }
  }

  const writeStored = (at: number): void => {
    try {
      window.localStorage.setItem(storageKey, String(at))
      window.localStorage.removeItem(legacyStorageKey)
    } catch {
      // Storage can be unavailable (private mode); cross-tab sync stays best-effort.
    }
  }

  const hide = (): void => {
    if (!showing) return
    showing = false
    onWarning(null)
  }

  const reset = (at: number): void => {
    lastActivityAt = at
    hide()
  }

  /** Recomputes warning/timeout from timestamps; safe to call at any moment. */
  const evaluate = (): void => {
    if (!running) return
    const elapsed = Date.now() - lastActivityAt
    if (elapsed >= timeoutAt) {
      // A "stay signed in" check must win over a simultaneous expiry.
      if (checking) return
      // Stop first so `onTimeout` cannot be re-entered by the next tick.
      stop()
      onTimeout()
      return
    }
    if (elapsed >= policy.warnAfterMs) {
      const seconds = Math.max(1, Math.ceil((timeoutAt - elapsed) / 1000))
      showing = true
      onWarning(seconds)
    } else {
      hide()
    }
  }

  const touch = (): void => {
    if (!running) return
    const now = Date.now()
    reset(now)
    if (now - lastBroadcastAt >= ACTIVITY_BROADCAST_MS) {
      lastBroadcastAt = now
      writeStored(now)
      announceActivity(now)
    }
  }

  const receiveActivity = (at: number): void => {
    if (!running) return
    if (Number.isFinite(at) && at > lastActivityAt) reset(at)
  }

  const onChannelMessage = (data: unknown): void => {
    if (typeof data !== 'object' || data === null) return
    const message = data as { t?: unknown; from?: unknown; at?: unknown }
    if (message.from === tabId) return
    if (message.t === 'activity' && typeof message.at === 'number') receiveActivity(message.at)
  }

  const onActivityEvent = (): void => touch()

  const onVisibility = (): void => {
    if (document.visibilityState !== 'visible') return
    // A suspended tab can miss broadcasts: adopt the freshest known timestamp,
    // then evaluate immediately instead of waiting for the next tick.
    const stored = readStored()
    if (stored > lastActivityAt) lastActivityAt = stored
    evaluate()
  }

  const attach = (): void => {
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivityEvent, { passive: true, capture: true })
    }
    document.addEventListener('visibilitychange', onVisibility)
    interval = setInterval(evaluate, TICK_MS)
    // No build ever posts on this channel: activity sharing flows through the
    // session channel (`announceActivity`), so a plain rename needs no bridge.
    channel = createContextChannel(`mfin.idle.${context}`, onChannelMessage)
  }

  const detach = (): void => {
    for (const event of ACTIVITY_EVENTS) {
      window.removeEventListener(event, onActivityEvent, { capture: true })
    }
    document.removeEventListener('visibilitychange', onVisibility)
    if (interval !== null) {
      clearInterval(interval)
      interval = null
    }
    if (channel !== null) {
      channel.close()
      channel = null
    }
  }

  const start = (): void => {
    if (running) return
    running = true
    showing = false
    checking = false
    lastActivityAt = Date.now()
    lastBroadcastAt = 0
    attach()
    touch() // records "now" and tells siblings the session is active
    evaluate() // honours a very short policy without waiting a tick
  }

  const stop = (): void => {
    if (!running) return
    running = false
    checking = false
    detach()
    hide()
    onBusy(false)
  }

  const stayAlive = async (): Promise<void> => {
    if (!running || checking) return
    checking = true
    onBusy(true)
    try {
      const alive = await verifyAlive()
      if (alive) touch()
      else hide() // the session ended elsewhere; the expired flow takes over
    } finally {
      checking = false
      onBusy(false)
    }
  }

  return { start, stop, touch, receiveActivity, stayAlive }
}
