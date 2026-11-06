import { err } from '@/shared/domain'
import type { Result } from '@/shared/domain'
import { decodeAccessToken } from '@/shared/infrastructure/jwt/decode'

import { createContextChannel } from './contextChannel'
import type { ContextChannel } from './contextChannel'
import type { TokenStore } from './tokenStore'

/** Which authentication context a runtime belongs to; keeps locks/channels apart. */
export type SessionContext = 'regular' | 'system'

/** Why a session ended without an explicit user logout. */
export type SessionEndReason = 'expired' | 'external-logout' | 'idle'

export interface SessionRuntimeOptions<T> {
  readonly context: SessionContext
  readonly tokens: TokenStore
  /**
   * Performs the actual network refresh. On success it MUST store the new access
   * token (the repository does this) so the runtime can announce it to other tabs.
   */
  readonly performRefresh: () => Promise<Result<T>>
  /**
   * Maps an access token adopted from another tab to an outcome, so this tab can
   * adopt a sibling's fresh token without a second network round-trip. It must
   * fail for a token belonging to another context (e.g. a PERSON token in SYSTEM).
   */
  readonly toOutcome: (accessToken: string) => Result<T>
  /**
   * Invoked when the session ends without an explicit logout: a renewal that could
   * not recover (`expired`), or a logout performed in another tab
   * (`external-logout`).
   */
  readonly onSessionEnded: (reason: SessionEndReason) => void
  /** Receives a sibling tab's activity timestamp (resets this tab's idle clock). */
  readonly onActivity?: (at: number) => void
  /**
   * Invoked when a sibling tab changed this session in place (a workspace switch),
   * so this tab re-bootstraps into the new scope. Optional: contexts without
   * in-place changes (SYSTEM) omit it.
   */
  readonly onSessionChanged?: () => void
}

/**
 * The one place that keeps a context's session alive across tabs:
 *
 * - `ensureFreshToken` serializes renewal per tab (single-flight) and across tabs
 *   (Web Locks), so two tabs never present the same rotating refresh cookie and
 *   trigger the server's reuse detection.
 * - A tab that just refreshed broadcasts its token, so a sibling can adopt it
 *   instead of refreshing again.
 * - Logouts are broadcast, so every tab of the context ends together.
 *
 * It is deliberately free of Vue/feature knowledge so the regular and the SYSTEM
 * context share one implementation.
 */
export interface SessionRuntime<T> {
  /**
   * Renews the access token for a reactive 401 retry or the proactive timer.
   * Resolves `true` when a usable token is in place. On failure it clears the
   * session through `onSessionEnded('expired')`.
   */
  ensureFreshToken(): Promise<boolean>
  /**
   * Restores the session at bootstrap from the refresh cookie. Unlike
   * `ensureFreshToken`, a failure is NOT an expiry: a first-time anonymous visitor
   * must never be told a session expired. Returns the mapped outcome.
   */
  restore(): Promise<Result<T>>
  /** Schedules proactive renewal for a freshly issued token (or cancels it). */
  noteAuthenticated(accessToken: string | null): void
  /** Cancels renewal and tells the other tabs of this context about the logout. */
  announceLogout(): void
  /** Marks the next logout as idle, so sibling tabs can report the reason. */
  armIdleLogout(): void
  /**
   * Marks an intentional logout as in progress. While set, a renewal never hits
   * the network and never reports `expired`, so a 401 from a request that was
   * already in flight during the logout cannot be mistaken for an expired session.
   * Cleared when a new session is established (`noteAuthenticated` with a token)
   * or by `endLogout` when the logout request fails.
   */
  beginLogout(): void
  /** Clears a pending intentional-logout mark after a failed logout request. */
  endLogout(): void
  /** Tells the other tabs of this context that local activity happened at `at`. */
  announceActivity(at: number): void
  /** Tells the other tabs of this context that the session scope changed in place. */
  announceSessionChanged(): void
  /**
   * Runs `run` while holding this context's cross-tab lock — the same lock that
   * serializes refresh. Used to serialize an in-place session change whose request
   * rotates the shared refresh cookie (a workspace switch) against a concurrent
   * refresh in a sibling tab, so the rotating cookie is never presented twice.
   * Falls back to running `run` directly where Web Locks is unavailable, exactly
   * like `ensureFreshToken`.
   */
  runExclusive<R>(run: () => Promise<R>): Promise<R>
}

/** Refresh this long before `exp`, leaving room for clock skew and the round-trip. */
const PROACTIVE_LEAD_MS = 60_000
/** Never schedule renewal sooner than this, so a very short TTL cannot spin. */
const MIN_DELAY_MS = 5_000

type SessionMessage =
  | { readonly t: 'logout'; readonly from: string; readonly reason?: SessionEndReason }
  | { readonly t: 'token'; readonly from: string; readonly token: string; readonly at: number }
  | { readonly t: 'activity'; readonly from: string; readonly at: number }
  | { readonly t: 'session-changed'; readonly from: string }

/** A cross-tab token offer, remembered until the next renewal attempt. */
interface SharedToken {
  readonly token: string
  readonly at: number
}

/** How many recent dual-channel message ids to remember for duplicate removal. */
const SEEN_MIDS_MAX = 64

/** The slice of `navigator.locks` actually used; absent in some browsers. */
interface LockManagerLike {
  request<R>(name: string, callback: () => Promise<R>): Promise<R>
}

const lockManager = (): LockManagerLike | null => {
  const locks = (navigator as unknown as { locks?: { request?: unknown } }).locks
  if (locks !== undefined && typeof locks.request === 'function') {
    return locks as unknown as LockManagerLike
  }
  return null
}

/**
 * Serializes `run` across tabs under BOTH lock names: the active one first, then
 * the pre-rename one, which tabs of the old build acquire alone. Holding both
 * keeps every version of this context mutually excluded while the shared
 * refresh cookie can rotate; the consistent order cannot deadlock against those
 * single-lock tabs. Without the Web Locks API it degrades to the per-tab
 * single-flight in `runRenew`, which is correct but cannot prevent a cross-tab
 * refresh race (see the open issues in the task report).
 */
const withTransitionLock = async <R>(
  name: string,
  legacyName: string,
  run: () => Promise<R>,
): Promise<R> => {
  const manager = lockManager()
  if (manager === null) return run()
  return manager.request(name, () => manager.request(legacyName, run))
}

const randomId = (): string => {
  const webCrypto = globalThis.crypto as { randomUUID?: () => string } | undefined
  if (webCrypto !== undefined && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export const createSessionRuntime = <T>({
  context,
  tokens,
  performRefresh,
  toOutcome,
  onSessionEnded,
  onActivity,
  onSessionChanged,
}: SessionRuntimeOptions<T>): SessionRuntime<T> => {
  // Active cross-tab names. The legacy ones are still listened to, broadcast
  // to, and acquired during the rename transition, so tabs of the pre-rename
  // build keep synchronizing and mutually excluding with this one over the same
  // rotating refresh cookie. Drop the legacy names and their bridging once no
  // pre-rename tab can still be open.
  const channelName = `mfin.session.${context}`
  const legacyChannelName = `365d.session.${context}`
  const lockName = `mfin.refresh.${context}`
  const legacyLockName = `365d.refresh.${context}`
  const tabId = randomId()

  let inFlight: Promise<boolean> | null = null
  let lastOutcome: Result<T> | null = null
  let shared: SharedToken | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let channels: ContextChannel[] = []
  let pendingLogoutReason: SessionEndReason | null = null
  let loggingOut = false
  const seenMids = new Set<string>()

  const cancelProactive = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  const scheduleProactive = (accessToken: string | null): void => {
    cancelProactive()
    if (accessToken === null) return
    const exp = decodeAccessToken(accessToken)?.exp
    if (typeof exp !== 'number') return
    const delay = Math.max(exp * 1000 - Date.now() - PROACTIVE_LEAD_MS, MIN_DELAY_MS)
    timer = setTimeout(() => {
      timer = null
      void ensureFreshToken()
    }, delay)
  }

  const handleMessage = (data: unknown): void => {
    if (typeof data !== 'object' || data === null) return
    const message = data as {
      t?: unknown
      from?: unknown
      token?: unknown
      at?: unknown
      reason?: unknown
      mid?: unknown
    }
    // Never act on this tab's own broadcasts.
    if (message.from === tabId) return

    // Posts go out on both channels, so tabs of this build receive them twice;
    // the `mid` tag drops the duplicate. Messages from pre-rename tabs carry no
    // `mid` and arrive once.
    if (typeof message.mid === 'string') {
      if (seenMids.has(message.mid)) return
      seenMids.add(message.mid)
      if (seenMids.size > SEEN_MIDS_MAX) {
        const oldest = seenMids.values().next().value
        if (oldest !== undefined) seenMids.delete(oldest)
      }
    }

    if (message.t === 'activity' && typeof message.at === 'number') {
      onActivity?.(message.at)
      return
    }

    if (message.t === 'session-changed') {
      onSessionChanged?.()
      return
    }

    if (message.t === 'logout') {
      cancelProactive()
      shared = null
      lastOutcome = null
      tokens.clear()
      onSessionEnded(message.reason === 'idle' ? 'idle' : 'external-logout')
      return
    }

    if (
      message.t === 'token' &&
      typeof message.token === 'string' &&
      typeof message.at === 'number'
    ) {
      shared = { token: message.token, at: message.at }
    }
  }

  const broadcast = (message: SessionMessage): void => {
    if (channels.length === 0) return
    // Tag each post so siblings of this build drop the duplicate delivery that
    // dual-channel posting produces; pre-rename tabs ignore the unknown field.
    const tagged = { ...message, mid: randomId() }
    for (const channel of channels) channel.post(tagged)
  }

  // Listen on both names so broadcasts from pre-rename tabs are still heard.
  if (typeof BroadcastChannel !== 'undefined') {
    channels = [
      createContextChannel(channelName, handleMessage),
      createContextChannel(legacyChannelName, handleMessage),
    ].filter((channel): channel is ContextChannel => channel !== null)
  }
  if (channels.length > 0) {
    // Close on unload so an abandoned tab stops receiving broadcasts.
    window.addEventListener(
      'pagehide',
      () => {
        for (const channel of channels) channel.close()
        channels = []
      },
      { once: true },
    )
  }

  /**
   * One renewal attempt. Under the cross-tab lock it first tries to adopt a fresh
   * token another tab just broadcast; otherwise it refreshes over the network and,
   * on success, broadcasts the new token to its siblings.
   *
   * `shouldNotify` is read at failure time so that when a bootstrap `restore()`
   * and a reactive 401 retry share one in-flight attempt, either caller's wish to
   * be told about an unrecoverable expiry is honoured.
   */
  const renew = (shouldNotify: () => boolean): Promise<boolean> => {
    const requestedAt = Date.now()
    return withTransitionLock(lockName, legacyLockName, async () => {
      // An intentional logout is in progress: never renew (neither adopt nor go to
      // the network) and never raise the expiry notice, so a 401 from a request
      // that was already in flight during the logout is not read as an expiry.
      if (loggingOut) return false

      const adopted = shared
      shared = null
      if (adopted !== null && adopted.at >= requestedAt) {
        const outcome = toOutcome(adopted.token)
        if (outcome.ok) {
          tokens.set(adopted.token)
          lastOutcome = outcome
          scheduleProactive(adopted.token)
          return true
        }
      }

      // The session was already torn down locally (the token is gone) after this
      // renewal was requested: a network refresh would be pointless and its failure
      // must not be reported as an expiry. Bootstrap `restore()` is exempt because
      // it deliberately starts with no token and relies on the refresh cookie.
      if (shouldNotify() && tokens.get() === null) return false

      const result = await performRefresh()
      lastOutcome = result
      if (!result.ok) {
        if (shouldNotify()) onSessionEnded('expired')
        return false
      }
      const token = tokens.get()
      if (token !== null) broadcast({ t: 'token', from: tabId, token, at: Date.now() })
      return true
    })
  }

  /**
   * Per-tab single-flight: concurrent callers share the same renewal attempt. A
   * bootstrap `restore()` does not want to raise the expiry notice; a reactive or
   * proactive renewal does. Once any caller asks for it, the shared attempt keeps
   * it, so a genuine expiry is never swallowed by whoever happened to start first.
   */
  let notifyWanted = false
  const runRenew = (notifyOnFailure: boolean): Promise<boolean> => {
    if (notifyOnFailure) notifyWanted = true
    if (inFlight === null) {
      notifyWanted = notifyOnFailure
      inFlight = renew(() => notifyWanted).finally(() => {
        inFlight = null
      })
    }
    return inFlight
  }

  const ensureFreshToken = (): Promise<boolean> => runRenew(true)

  const restore = async (): Promise<Result<T>> => {
    await runRenew(false)
    return lastOutcome ?? err({ kind: 'Unknown', status: null })
  }

  const noteAuthenticated = (accessToken: string | null): void => {
    // A freshly established session (login, register, workspace select/switch or a
    // successful refresh restore) clears any intentional-logout mark, so a later
    // genuine expiry can renew again.
    if (accessToken !== null) loggingOut = false
    scheduleProactive(accessToken)
  }

  const announceLogout = (): void => {
    cancelProactive()
    shared = null
    lastOutcome = null
    const reason = pendingLogoutReason
    pendingLogoutReason = null
    broadcast(reason === null ? { t: 'logout', from: tabId } : { t: 'logout', from: tabId, reason })
  }

  const armIdleLogout = (): void => {
    pendingLogoutReason = 'idle'
  }

  const beginLogout = (): void => {
    loggingOut = true
    // Stop the proactive timer so it cannot fire a (now suppressed) renewal while
    // the logout request is in flight.
    cancelProactive()
  }

  const endLogout = (): void => {
    loggingOut = false
  }

  const announceActivity = (at: number): void => {
    broadcast({ t: 'activity', from: tabId, at })
  }

  const announceSessionChanged = (): void => {
    broadcast({ t: 'session-changed', from: tabId })
  }

  // Shares the refresh lock with `renew`, so an in-place session change (a
  // workspace switch) is serialized against refresh across tabs.
  const runExclusive = <R>(run: () => Promise<R>): Promise<R> =>
    withTransitionLock(lockName, legacyLockName, run)

  // A tab that was hidden while its access token expired resumes the session the
  // moment it becomes visible again, instead of waiting for the next 401.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return
    const token = tokens.get()
    if (token === null) return
    const exp = decodeAccessToken(token)?.exp
    if (typeof exp !== 'number') return
    if (exp * 1000 - Date.now() <= PROACTIVE_LEAD_MS) void ensureFreshToken()
  })

  return {
    ensureFreshToken,
    restore,
    noteAuthenticated,
    announceLogout,
    armIdleLogout,
    beginLogout,
    endLogout,
    announceActivity,
    announceSessionChanged,
    runExclusive,
  }
}
