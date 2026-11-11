import type { NavigationGuard } from 'vue-router'

import { loadAccountWorkspaces, useAuthSessionStore } from '@/features/auth'
import type { AuthUseCases } from '@/features/auth'
import type { I18nFeature } from '@/features/i18n'
import { useModuleMenu } from '@/features/org-dashboard'
import { useAdminPermissionsStore } from '@/features/system-admin'
import type { AdminUseCases } from '@/features/system-admin'
import { useSystemSessionStore } from '@/features/system-auth'
import type { SystemAuthUseCases } from '@/features/system-auth'
import type { Principal, UserProfile } from '@/shared/domain'
import { regularDashboardRoute, workspaceOf } from '@/shared/presentation/navigation/dashboardRoute'
import type { RegularDashboardRoute } from '@/shared/presentation/navigation/dashboardRoute'

/**
 * The shell's hook into the inactivity timeout. The guard only decides *when* a
 * context becomes authenticated/anonymous; the composition root owns the idle
 * runtimes, the warning dialog and the idle logout. Both calls are idempotent, so
 * calling them on every navigation neither restarts the clock nor duplicates
 * listeners.
 */
export interface IdleControl {
  activate(context: 'regular' | 'system'): void
  deactivate(context: 'regular' | 'system'): void
}

export interface GuardDeps {
  readonly auth: AuthUseCases
  readonly system: SystemAuthUseCases
  readonly admin: AdminUseCases
  readonly i18n: I18nFeature
  readonly idle: IdleControl
}

/**
 * Applies a loaded profile's saved language, so the app renders in the user's
 * language from the first authenticated page. Translations are loaded before the
 * locale switches (see `I18nFeature.switchTo`), and any failure keeps the
 * current language without blocking navigation.
 *
 * The regular context only: the SYSTEM realm exposes no saved language, so its
 * screen keeps the browser's current locale.
 */
const applyAccountLanguage = async (
  profile: UserProfile,
  i18n: I18nFeature,
  pages: readonly string[],
): Promise<void> => {
  const code = profile.languageCode
  if (code === null || code.length === 0 || code === i18n.currentLocale()) return
  await i18n.switchTo(code, pages)
}

// The saved language is adopted at most once per authenticated session, so a
// later manual switch is not undone on every navigation. It resets when the
// session ends, so a fresh sign-in always re-adopts the account language.
let regularLanguageApplied = false
// The person's switchable tenants are fetched at most once per authenticated
// session (for the account label); the switch dialog re-fetches on open.
let regularWorkspacesLoaded = false
// The sidebar default (expanded) is applied at most once per authenticated
// session, and only for a fresh sign-in: a component-driven login reaches the
// guard with the store already `authenticated`, while a reload restore passes
// through the `unknown` bootstrap below — only the former resets the menu, so a
// saved collapsed preference survives reloads but never a new login. Resets
// when the session ends, so the next login always starts expanded.
let regularMenuDefaulted = false
let systemMenuDefaulted = false
// The SYSTEM caller's permissions are resolved from `/admin/me` at most once per
// authenticated session, before the first SYSTEM page renders, so the sidebar and
// action buttons never flash items the caller cannot use. Resets with the session.
let systemAdminLoaded = false

/**
 * The regular application area a signed-in principal owns, or `null` when it has
 * none. Reuses `regularDashboardRoute` for the mapping and only adds the safety
 * gate: the returned route always admits its own workspace, so redirecting a
 * wrong-workspace visit here cannot loop back into this branch.
 */
const regularAreaFor = (principal: Principal | null): RegularDashboardRoute | null => {
  if (principal === null) return null
  if (principal.type !== 'PERSON' && principal.type !== 'ORG') return null
  return regularDashboardRoute(principal)
}

/**
 * Single global guard. It resolves the auth context from the path prefix, so a
 * SYSTEM route can only ever touch the SYSTEM store (and only call the SYSTEM
 * refresh), and vice versa.
 */
export const createAuthGuard = ({
  auth,
  system,
  admin,
  i18n,
  idle,
}: GuardDeps): NavigationGuard => {
  // The org sidebar's expanded default is enforced from the guard so it lands
  // before the first authenticated page renders (no wrong-state flash).
  const { resetToExpanded } = useModuleMenu()

  return async (to) => {
    const context = to.path.startsWith('/system') ? 'system' : 'regular'
    const meta = to.meta
    const pages = (): string[] => ['common', ...(meta.translationPages ?? [])]
    const ensureTranslations = (): Promise<void> => i18n.ensure(i18n.currentLocale(), pages())

    if (context === 'system') {
      const store = useSystemSessionStore()

      // Captured before the bootstrap: `unknown` here means this navigation is a
      // refresh restore, not a fresh sign-in — the same distinction the regular
      // context draws below.
      const restoredHere = store.status === 'unknown'

      // Bootstrap once per context: the SYSTEM refresh cookie restores the session.
      if (store.status === 'unknown') {
        store.startRestoring()
        const result = await system.refresh()
        if (result.ok) store.setAuthenticated(result.value.principal)
        else store.setAnonymous()
      }

      if (!store.isAuthenticated) {
        systemMenuDefaulted = false
        systemAdminLoaded = false
        useAdminPermissionsStore().clear()
      }

      if (store.isAuthenticated) idle.activate('system')
      else idle.deactivate('system')

      // `principals` protects the route even without `requiresAuth`, so a
      // wrong-type session can never render a SYSTEM-only page.
      const allowed = meta.principals
      if (meta.requiresAuth || allowed !== undefined) {
        if (!store.isAuthenticated) return { name: 'system-login' }
      }
      if (
        allowed !== undefined &&
        store.principalType !== null &&
        !allowed.includes(store.principalType)
      ) {
        // The SYSTEM context is isolated and has a single area, so a wrong-type
        // session has nowhere safe to be redirected; dropping it (and its
        // in-memory principal) is the loop-safe choice.
        store.setAnonymous()
        return { name: 'system-login' }
      }
      if (meta.guestOnly && store.isAuthenticated) return { name: 'system-dashboard' }

      // Resolve the caller's roles/permissions once per session, before the first
      // SYSTEM page renders, so permission-gated menu items and actions never
      // flash. A failure (e.g. the endpoint is unavailable) leaves the grant set
      // empty — the UI hides gated features and the server still enforces.
      if (store.isAuthenticated && !systemAdminLoaded) {
        systemAdminLoaded = true
        const permissions = useAdminPermissionsStore()
        permissions.startLoading()
        const result = await admin.getMe()
        if (result.ok) permissions.setLoaded(result.value)
        else permissions.setError()
      }

      // Expand the sidebar once per authenticated session, but only for a fresh
      // sign-in — never on a reload restore, so a mid-session collapse survives.
      // The SYSTEM menu shares the org menu's preference and composable, so the
      // reset lands before the first SYSTEM page renders (no wrong-state flash).
      if (store.isAuthenticated && !systemMenuDefaulted && !restoredHere) {
        systemMenuDefaulted = true
        resetToExpanded()
      }

      await ensureTranslations()
      return true
    }

    const store = useAuthSessionStore()

    // Captured before the bootstrap: `unknown` here means this navigation is a
    // refresh restore, not a fresh sign-in.
    const restoredHere = store.status === 'unknown'

    // The profile fetched during the bootstrap, reused for language adoption so
    // the first authenticated navigation issues only one `/identity/me`.
    let bootstrapProfile: UserProfile | null = null

    // Bootstrap once per context: the refresh cookie restores the session, then
    // `/identity/me` supplies the user id the token response does not carry.
    if (store.status === 'unknown') {
      store.startRestoring()
      const result = await auth.refresh()
      if (result.ok) {
        let principal = result.value.principal
        const profile = await auth.getProfile()
        if (profile.ok) {
          bootstrapProfile = profile.value
          principal = { ...principal, userId: profile.value.uuid }
        }
        store.setAuthenticated(principal)
      } else {
        // A first-time anonymous visitor (or an expired refresh cookie) is silent:
        // the runtime's `restore()` never raises the session-expired notice.
        store.setAnonymous()
      }
    }

    if (!store.isAuthenticated) {
      regularLanguageApplied = false
      regularWorkspacesLoaded = false
      regularMenuDefaulted = false
    }

    // Idle tracking follows the session: it starts once the context is
    // authenticated and stops the moment it is anonymous. Both calls are
    // idempotent, so ordinary navigation does not reset the inactivity clock.
    if (store.isAuthenticated) idle.activate('regular')
    else idle.deactivate('regular')

    // `principals` protects the route even without `requiresAuth`, and so does
    // `workspace`, so a wrong-type or wrong-workspace session can never render a
    // page it does not own.
    const allowed = meta.principals
    if (meta.requiresAuth || allowed !== undefined || meta.workspace !== undefined) {
      if (!store.isAuthenticated) return { name: 'login' }
    }
    if (
      allowed !== undefined &&
      store.principalType !== null &&
      !allowed.includes(store.principalType)
    ) {
      // A valid session should not be lost just because the user opened an area
      // that belongs to another principal type. Send them to the area their own
      // principal owns instead of clearing the session.
      const area = regularAreaFor(store.principal)
      if (area !== null) return { name: area }
      store.setAnonymous()
      return { name: 'login' }
    }
    // A session in the other workspace is redirected to its own area (never
    // cleared): this is how a PERSON who chose an org reaches `/org`, and how a
    // real ORG stays out of the personal pages.
    if (
      meta.workspace !== undefined &&
      store.isAuthenticated &&
      meta.workspace !== workspaceOf(store.principal)
    ) {
      return { name: regularDashboardRoute(store.principal) }
    }
    // Follow the principal's workspace, so an authenticated org-workspace session
    // is never sent to the PERSON home route (and vice versa).
    if (meta.guestOnly && store.isAuthenticated) {
      return { name: regularDashboardRoute(store.principal) }
    }

    // Adopt the account's saved language once per session (login and refresh
    // restore both funnel through here), reusing the bootstrap profile when one
    // was fetched. The loaded profile also fills the informational user id.
    if (store.isAuthenticated && !regularLanguageApplied) {
      regularLanguageApplied = true
      let profile = bootstrapProfile
      if (profile === null) {
        const loaded = await auth.getProfile()
        if (loaded.ok) profile = loaded.value
      }
      if (profile !== null) {
        await applyAccountLanguage(profile, i18n, pages())
        if (store.principal !== null && store.principal.userId === null) {
          store.setAuthenticated({ ...store.principal, userId: profile.uuid })
        }
      }
    }

    // Expand the sidebar once per authenticated session, but only for a fresh
    // sign-in — never on a reload restore, so a mid-session collapse survives.
    if (store.isAuthenticated && !regularMenuDefaulted && !restoredHere) {
      regularMenuDefaulted = true
      resetToExpanded()
    }

    // Load the person's switchable tenants once per session for the account label
    // and the switch dialog. Any authenticated regular session may have more than
    // one membership (including a PERSON currently scoped to an organization).
    if (store.isAuthenticated && !regularWorkspacesLoaded) {
      regularWorkspacesLoaded = true
      void loadAccountWorkspaces(auth)
    }

    await ensureTranslations()
    return true
  }
}
