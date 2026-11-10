import { useAuthSessionStore } from '@/features/auth'
import type { AuthOutcome } from '@/features/auth'
import { loadAccountWorkspaces } from '@/features/auth'
import { createAuthUseCases } from '@/features/auth/application/useCases'
import { createAuthRepository } from '@/features/auth/infrastructure/authRepository'
import { createEimzoAdapter } from '@/features/auth/infrastructure/eimzo/createEimzoAdapter'
import { createI18nFeature } from '@/features/i18n'
import { createI18nUseCases } from '@/features/i18n/application/useCases'
import {
  createLanguageRepository,
  createTranslationRepository,
} from '@/features/i18n/infrastructure/publicContentRepository'
import { createNotificationsUseCases } from '@/features/notifications/application/useCases'
import { createNotificationPreferencesRepository } from '@/features/notifications/infrastructure/notificationPreferencesRepository'
import { createAdminRepository, createAuditLogRepository } from '@/features/system-admin'
import type { AdminUseCases, AuditLogRepository } from '@/features/system-admin'
import { createAdminUseCases } from '@/features/system-admin/application/useCases'
import { useSystemSessionStore } from '@/features/system-auth'
import type { SystemSession } from '@/features/system-auth'
import { createSystemAuthUseCases } from '@/features/system-auth/application/useCases'
import { createSystemAuthRepository } from '@/features/system-auth/infrastructure/systemAuthRepository'
import { createPlaceholderWalletService } from '@/features/wallet'
import type { WalletService } from '@/features/wallet'
import { createApiClient } from '@/shared/infrastructure/api/client'
import { readEnv } from '@/shared/infrastructure/config/env'
import { readIdlePolicies } from '@/shared/infrastructure/config/idle'
import { createIdleRuntime } from '@/shared/infrastructure/session/idleRuntime'
import type { IdleRuntime } from '@/shared/infrastructure/session/idleRuntime'
import { createSessionRuntime } from '@/shared/infrastructure/session/sessionRuntime'
import type { SessionContext, SessionRuntime } from '@/shared/infrastructure/session/sessionRuntime'
import { createTokenStore } from '@/shared/infrastructure/session/tokenStore'
import { regularDashboardRoute, workspaceOf } from '@/shared/presentation/navigation/dashboardRoute'
import {
  registerIdleDialog,
  setIdleBusy,
  setIdleWarning,
} from '@/shared/presentation/composables/useIdleTimeout'
import {
  showIdleLogout,
  showSessionExpired,
} from '@/shared/presentation/composables/useSessionNotice'

import { createAppRouter } from '../router'
import type { IdleControl } from '../router/guards'

export interface AppContainer {
  readonly router: ReturnType<typeof createAppRouter>
  readonly i18n: ReturnType<typeof createI18nFeature>
  readonly authUseCases: ReturnType<typeof createAuthUseCases>
  readonly notificationsUseCases: ReturnType<typeof createNotificationsUseCases>
  readonly systemAuthUseCases: ReturnType<typeof createSystemAuthUseCases>
  readonly adminUseCases: AdminUseCases
  readonly auditLogRepository: AuditLogRepository
  readonly walletService: WalletService
}

/**
 * Manual composition root — the ONLY place where ports are bound to
 * implementations. Nothing here reaches into presentation; it builds adapter
 * graphs and hands them out (the one exception is the session-expiry notice
 * setter, which the root UI renders).
 */
export const createContainer = (): AppContainer => {
  const { apiBaseUrl, baseUrl } = readEnv()
  const idlePolicies = readIdlePolicies()

  // Two independent contexts: separate in-memory token stores (and therefore
  // separate Bearer injection), so a SYSTEM session can never send the regular
  // token and the two handles never share a cookie jar.
  const authTokens = createTokenStore()
  const systemTokens = createTokenStore()

  // Late-bound: the clients' 401 hooks and the repositories' refresh/session
  // hooks all call back into these runtimes, which are created after the router
  // (they redirect). The `!` defers assignment and the closures only run once the
  // container is fully built, so the definite-assignment `!` is safe; the
  // variables are therefore assigned exactly once, later — `const` cannot express
  // that without a throwaway holder.
  // eslint-disable-next-line prefer-const -- assigned once, after the router exists
  let authRuntime!: SessionRuntime<AuthOutcome>
  // eslint-disable-next-line prefer-const -- assigned once, after the router exists
  let systemRuntime!: SessionRuntime<SystemSession>
  // The idle runtimes are late-bound for the same reason: each side reaches into
  // the other through closures that only run once the container is fully built
  // (a "stay signed in" verifies the session; a sibling tab's activity resets the
  // idle clock).
  // eslint-disable-next-line prefer-const -- assigned once, after the session runtimes exist
  let authIdle!: IdleRuntime
  // eslint-disable-next-line prefer-const -- assigned once, after the session runtimes exist
  let systemIdle!: IdleRuntime

  const authClient = createApiClient({
    baseUrl: apiBaseUrl,
    getAccessToken: authTokens.get,
    onUnauthorized: () => authRuntime.ensureFreshToken(),
  })
  const systemClient = createApiClient({
    baseUrl: apiBaseUrl,
    getAccessToken: systemTokens.get,
    onUnauthorized: () => systemRuntime.ensureFreshToken(),
  })
  // Public content (translations, languages) never carries credentials and never
  // participates in the refresh-and-retry flow.
  const publicClient = createApiClient({ baseUrl: apiBaseUrl, getAccessToken: () => null })

  const authRepository = createAuthRepository({
    client: authClient,
    tokens: authTokens,
    eimzo: createEimzoAdapter({ baseUrl, apiBaseUrl }),
    refreshRunner: () => authRuntime.restore(),
    onLoggedOut: () => authRuntime.announceLogout(),
    onLogoutStart: () => authRuntime.beginLogout(),
    onLogoutFailed: () => authRuntime.endLogout(),
    onSession: (accessToken, expiresInSec) =>
      authRuntime.noteAuthenticated(accessToken, expiresInSec),
    // A workspace switch changes the session in place; tell sibling tabs to resync.
    onSessionChanged: () => authRuntime.announceSessionChanged(),
    // A workspace switch rotates the shared refresh cookie: run it under the same
    // cross-tab lock as refresh so it cannot race a sibling tab's renewal.
    runExclusive: (run) => authRuntime.runExclusive(run),
  })

  const systemAuthRepository = createSystemAuthRepository({
    client: systemClient,
    tokens: systemTokens,
    refreshRunner: () => systemRuntime.restore(),
    onLoggedOut: () => systemRuntime.announceLogout(),
    onLogoutStart: () => systemRuntime.beginLogout(),
    onLogoutFailed: () => systemRuntime.endLogout(),
    onSession: (accessToken) => systemRuntime.noteAuthenticated(accessToken),
  })

  const auditLogRepository = createAuditLogRepository({ client: systemClient })

  const adminUseCases = createAdminUseCases({
    repository: createAdminRepository({ client: systemClient }),
  })

  const authUseCases = createAuthUseCases({ repository: authRepository })

  // Notification preferences (including the account's interface language) use
  // the regular authenticated client: they belong to the PERSON/ORG realm.
  const notificationsUseCases = createNotificationsUseCases({
    repository: createNotificationPreferencesRepository(authClient),
  })

  const systemAuthUseCases = createSystemAuthUseCases({ repository: systemAuthRepository })

  const i18n = createI18nFeature({
    useCases: createI18nUseCases({
      translations: createTranslationRepository(publicClient),
      languages: createLanguageRepository(publicClient),
    }),
  })

  // Development placeholder data until the wallet backend exists; see
  // createPlaceholderWalletService for the single source of the sample amount.
  const walletService = createPlaceholderWalletService()

  /**
   * Ends an idle session exactly like a manual logout (best-effort endpoint, tokens
   * cleared, store anonymous, redirect), but WITHOUT the confirmation dialog, and
   * arms the cross-tab broadcast so every sibling tab reports the idle reason. The
   * initiating tab shows the notice itself (it ignores its own broadcast).
   */
  const idleLogout = async (context: SessionContext): Promise<void> => {
    if (context === 'system') {
      systemIdle.stop()
      systemRuntime.armIdleLogout()
      showIdleLogout()
      try {
        await systemAuthUseCases.logout()
      } finally {
        useSystemSessionStore().setAnonymous()
        await router.push({ name: 'system-login' })
      }
      return
    }
    authIdle.stop()
    authRuntime.armIdleLogout()
    showIdleLogout()
    try {
      await authUseCases.logout()
    } finally {
      useAuthSessionStore().setAnonymous()
      await router.push({ name: 'login' })
    }
  }

  const idleFor = (context: SessionContext): IdleRuntime =>
    context === 'system' ? systemIdle : authIdle

  // One context is idle-tracked at a time (the regular and SYSTEM areas are never
  // both authenticated in the same window), and only one dialog is ever bound.
  let boundContext: SessionContext | null = null

  const idleControl: IdleControl = {
    activate: (context) => {
      if (boundContext !== null && boundContext !== context) idleFor(boundContext).stop()
      boundContext = context
      const idle = idleFor(context)
      registerIdleDialog({
        stayAlive: () => void idle.stayAlive(),
        logoutNow: () => void idleLogout(context),
      })
      idle.start()
    },
    deactivate: (context) => {
      idleFor(context).stop()
      if (boundContext === context) {
        boundContext = null
        registerIdleDialog(null)
      }
    },
  }

  const router = createAppRouter({
    auth: authUseCases,
    system: systemAuthUseCases,
    admin: adminUseCases,
    i18n,
    idle: idleControl,
  })

  /**
   * A sibling tab switched the workspace in place. This tab re-bootstraps from the
   * shared refresh cookie (through the runtime's locked single-flight, so a burst of
   * tabs cannot stampede or trigger reuse detection), updates the store, refreshes
   * the cached workspaces, and re-routes only if the current page belongs to the
   * workspace it just left. It never calls `switch_workspace` itself.
   */
  const resyncRegularSession = (): void => {
    void (async () => {
      const store = useAuthSessionStore()
      const result = await authRuntime.restore()
      if (!result.ok) return

      const outcome = result.value
      store.setAuthenticated(outcome.principal)
      // Refresh the cached tenant list/label for the new scope (any tenant type).
      await loadAccountWorkspaces(authUseCases)

      const current = router.currentRoute.value
      if (
        current.meta.workspace !== undefined &&
        current.meta.workspace !== workspaceOf(outcome.principal)
      ) {
        await router.replace({ name: regularDashboardRoute(outcome.principal) })
      }
    })()
  }

  authRuntime = createSessionRuntime({
    context: 'regular',
    tokens: authTokens,
    performRefresh: () => authRepository.performRefresh(),
    // A sibling tab's fresh token is resolved through `/identity/me`; the regular
    // context never decodes a token.
    adoptToken: (accessToken, expiresAt) => authRepository.adoptSession(accessToken, expiresAt),
    onActivity: (at) => authIdle.receiveActivity(at),
    onSessionChanged: resyncRegularSession,
    onSessionEnded: (reason) => {
      useAuthSessionStore().setAnonymous()
      if (reason === 'expired') showSessionExpired()
      else if (reason === 'idle') showIdleLogout()
      void router.push({ name: 'login' })
    },
  })

  systemRuntime = createSessionRuntime({
    context: 'system',
    tokens: systemTokens,
    performRefresh: () => systemAuthRepository.performRefresh(),
    toOutcome: (accessToken) => systemAuthRepository.toOutcome(accessToken),
    // Transitional SYSTEM-only JWT fallback: REMOVE together with `toOutcome` once
    // `/system/auth` returns `expires_in` and a tenant summary like `/identity/*`.
    readExpiryFromToken: true,
    onActivity: (at) => systemIdle.receiveActivity(at),
    onSessionEnded: (reason) => {
      useSystemSessionStore().setAnonymous()
      if (reason === 'expired') showSessionExpired()
      else if (reason === 'idle') showIdleLogout()
      void router.push({ name: 'system-login' })
    },
  })

  authIdle = createIdleRuntime({
    context: 'regular',
    policy: idlePolicies.regular,
    onWarning: setIdleWarning,
    onBusy: setIdleBusy,
    onTimeout: () => void idleLogout('regular'),
    verifyAlive: () => authRuntime.ensureFreshToken(),
    announceActivity: (at) => authRuntime.announceActivity(at),
  })

  systemIdle = createIdleRuntime({
    context: 'system',
    policy: idlePolicies.system,
    onWarning: setIdleWarning,
    onBusy: setIdleBusy,
    onTimeout: () => void idleLogout('system'),
    verifyAlive: () => systemRuntime.ensureFreshToken(),
    announceActivity: (at) => systemRuntime.announceActivity(at),
  })

  return {
    router,
    i18n,
    authUseCases,
    notificationsUseCases,
    systemAuthUseCases,
    adminUseCases,
    auditLogRepository,
    walletService,
  }
}
