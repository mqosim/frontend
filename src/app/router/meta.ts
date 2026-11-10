import type { PrincipalType } from '@/shared/domain'

/**
 * Route metadata contract. Every field is declarative data the guard reads, so
 * routing policy stays in one place instead of being scattered across views.
 */
declare module 'vue-router' {
  interface RouteMeta {
    /** Which chrome to wrap the view in. */
    layout?: 'auth' | 'person' | 'system' | 'public' | 'landing' | 'org' | 'settings'
    /** Requires a complete session in this context. */
    requiresAuth?: boolean
    /** Only reachable while anonymous (login/register). */
    guestOnly?: boolean
    /** Principal types the session must have; others are rejected. */
    principals?: readonly PrincipalType[]
    /**
     * The workspace the session must be in. A session in the other workspace is
     * redirected to its own area (never cleared) — this is how a PERSON who chose
     * an organization reaches `/org`, and how a real ORG stays out of the personal
     * pages.
     */
    workspace?: 'personal' | 'org'
    /** Translation page slugs to load for the view; `common` is always added. */
    translationPages?: readonly string[]
    /** Which SYSTEM sidebar module a (list/detail) route belongs to. */
    systemModule?: string
  }
}

export {}
