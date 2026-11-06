<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { useAuthSessionStore } from '@/features/auth'
import { LanguageSwitcher } from '@/features/i18n'
import { useSystemSessionStore } from '@/features/system-auth'
import BrandLogo from '@/shared/presentation/components/BrandLogo.vue'
import ThemeToggle from '@/shared/presentation/components/ThemeToggle.vue'
import { regularDashboardRoute } from '@/shared/presentation/navigation/dashboardRoute'

/**
 * Marketing chrome for the public landing page: a sticky header (brand, section
 * anchors, auth-aware actions) and a quiet footer around the page sections. It
 * is deliberately separate from PublicLayout, whose centered main suits the
 * short NotFound page but not a long page. The language switcher and theme
 * toggle live in the header's action group (the app-root fixed controls skip
 * this layout), so the header owns its full width.
 */
const { t } = useI18n()
const route = useRoute()
const authSession = useAuthSessionStore()
const systemSession = useSystemSessionStore()

// Signed-in visitors keep their way back: the header swaps Login/Register for a
// single Dashboard link (SYSTEM session takes precedence).
const dashboardRouteName = computed<'app-home' | 'system-dashboard' | 'org' | null>(() => {
  if (systemSession.isAuthenticated) return 'system-dashboard'
  if (authSession.isAuthenticated) return regularDashboardRoute(authSession.principal)
  return null
})

// ── Mobile menu: disclosure pattern ─────────────────────────────────────────
const menuOpen = ref(false)

const closeMenu = (): void => {
  menuOpen.value = false
}

const toggleMenu = (): void => {
  menuOpen.value = !menuOpen.value
}

// Section navigation is same-page, so clicking a link leaves the route intact:
// close the menu explicitly. Route changes (Login, Register, Dashboard) also
// dismiss it.
watch(() => route.fullPath, closeMenu)

const onMenuKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape' && menuOpen.value) closeMenu()
}

onBeforeUnmount(closeMenu)
</script>

<template>
  <div class="landing" @keydown="onMenuKeydown">
    <header class="landing__header">
      <div class="landing__header-inner">
        <RouterLink class="landing__brand" :to="{ name: 'landing' }" aria-label="MFIN">
          <BrandLogo />
        </RouterLink>

        <nav class="landing__nav" :aria-label="t('landing.nav.features')">
          <a class="landing__nav-link" href="#features">{{ t('landing.nav.features') }}</a>
          <a class="landing__nav-link" href="#how">{{ t('landing.nav.how') }}</a>
          <a class="landing__nav-link" href="#security">{{ t('landing.nav.security') }}</a>
        </nav>

        <div class="landing__actions">
          <!-- Selector matches the Login page: selected-first alternatives,
               hover-open, menu attached to the trigger (click and keyboard
               still work for touch and assistive tech). The theme toggle keeps
               the rule the root controls applied on this layout: guest-only. -->
          <LanguageSwitcher :prioritize-selected="true" />
          <ThemeToggle v-if="!authSession.isAuthenticated" />

          <template v-if="dashboardRouteName">
            <RouterLink class="landing__login" :to="{ name: dashboardRouteName }">
              {{ t('nav.dashboard') }}
            </RouterLink>
          </template>
          <template v-else>
            <RouterLink class="landing__login" :to="{ name: 'login' }">
              {{ t('nav.login') }}
            </RouterLink>
            <RouterLink class="landing__cta" :to="{ name: 'register' }">
              {{ t('landing.cta.start') }}
            </RouterLink>
          </template>

          <button
            type="button"
            class="landing__menu-toggle"
            :aria-label="t('landing.a11y.menu')"
            aria-haspopup="true"
            aria-controls="landing-menu"
            :aria-expanded="menuOpen"
            @click="toggleMenu"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <template v-if="menuOpen">
                <path d="M6 6l12 12M18 6 6 18" />
              </template>
              <template v-else>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </template>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="menuOpen" id="landing-menu" class="landing__menu">
        <a class="landing__menu-link" href="#features" @click="closeMenu">
          {{ t('landing.nav.features') }}
        </a>
        <a class="landing__menu-link" href="#how" @click="closeMenu">
          {{ t('landing.nav.how') }}
        </a>
        <a class="landing__menu-link" href="#security" @click="closeMenu">
          {{ t('landing.nav.security') }}
        </a>
        <template v-if="dashboardRouteName">
          <RouterLink
            class="landing__menu-link landing__menu-link--accent"
            :to="{ name: dashboardRouteName }"
          >
            {{ t('nav.dashboard') }}
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink class="landing__menu-link" :to="{ name: 'login' }" @click="closeMenu">
            {{ t('nav.login') }}
          </RouterLink>
          <RouterLink
            class="landing__menu-link landing__menu-link--accent"
            :to="{ name: 'register' }"
            @click="closeMenu"
          >
            {{ t('landing.cta.start') }}
          </RouterLink>
        </template>
      </div>
    </header>

    <main id="main" tabindex="-1" class="landing__main">
      <slot />
    </main>

    <footer class="landing__footer">
      <div class="landing__footer-inner">
        <div class="landing__footer-brand">
          <BrandLogo />
          <p class="landing__footer-tagline">{{ t('landing.footer.tagline') }}</p>
        </div>
        <nav class="landing__footer-nav" :aria-label="t('landing.nav.features')">
          <a class="landing__footer-link" href="#features">{{ t('landing.nav.features') }}</a>
          <a class="landing__footer-link" href="#how">{{ t('landing.nav.how') }}</a>
          <RouterLink class="landing__footer-link" :to="{ name: 'login' }">
            {{ t('nav.login') }}
          </RouterLink>
          <RouterLink class="landing__footer-link" :to="{ name: 'register' }">
            {{ t('nav.register') }}
          </RouterLink>
        </nav>
      </div>
      <p class="landing__footer-copy">© MFIN</p>
    </footer>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background-color: var(--color-bg);
}

/* ── Header ─────────────────────────────────────────────────────────────── */
.landing__header {
  position: sticky;
  top: 0;
  z-index: var(--z-drawer);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.landing__header-inner {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  max-width: 76rem;
  height: 4rem;
  padding: 0 var(--space-4) 0 var(--space-5);
  margin-inline: auto;
}

.landing__brand {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  color: var(--color-text);
  text-decoration: none;
}

.landing__nav {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.landing__nav-link {
  display: inline-flex;
  align-items: center;
  height: var(--global-controls-height);
  padding-inline: var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  font-weight: 550;
  text-decoration: none;
  white-space: nowrap;
}

.landing__nav-link:hover {
  background-color: var(--color-bg);
  color: var(--color-text);
}

.landing__actions {
  display: flex;
  flex: 1;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  min-width: 0;
}

/* Secondary text button: quiet next to the bordered utility controls, with a
   hover surface instead of a border so it never competes with the primary. */
.landing__login {
  display: inline-flex;
  align-items: center;
  height: var(--global-controls-height);
  padding-inline: var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
}

.landing__login:hover {
  background-color: var(--color-bg);
}

.landing__cta {
  display: inline-flex;
  align-items: center;
  height: var(--global-controls-height);
  padding-inline: var(--space-4);
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.15s ease;
}

.landing__cta:hover {
  background-color: var(--color-primary-hover);
}

.landing__menu-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: var(--global-controls-height);
  height: var(--global-controls-height);
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text);
  cursor: pointer;
}

.landing__menu-toggle svg {
  width: 1.25rem;
  height: 1.25rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Mobile menu: a full-width panel under the sticky header. */
.landing__menu {
  display: flex;
  flex-direction: column;
  padding: var(--space-2) var(--space-5) var(--space-4);
  border-top: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.landing__menu-link {
  display: flex;
  align-items: center;
  min-height: 2.75rem;
  padding-inline: var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  font-size: var(--font-size-md);
  text-decoration: none;
}

.landing__menu-link:hover {
  background-color: var(--color-bg);
}

.landing__menu-link--accent {
  color: var(--color-primary);
  font-weight: 600;
}

/* ── Main ───────────────────────────────────────────────────────────────── */
.landing__main {
  flex: 1;
}

/* ── Footer ─────────────────────────────────────────────────────────────── */
.landing__footer {
  padding: var(--space-7) var(--space-5) var(--space-5);
  border-top: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.landing__footer-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-5);
  max-width: 76rem;
  margin-inline: auto;
}

.landing__footer-brand {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  color: var(--color-text);
}

.landing__footer-tagline {
  max-width: 22rem;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.landing__footer-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-5);
}

.landing__footer-link {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  text-decoration: none;
  white-space: nowrap;
}

.landing__footer-link:hover {
  color: var(--color-text);
  text-decoration: underline;
}

.landing__footer-copy {
  max-width: 76rem;
  margin-inline: auto;
  padding-top: var(--space-5);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (max-width: 56rem) {
  .landing__nav {
    display: none;
  }

  .landing__actions {
    flex: 1;
  }

  .landing__menu-toggle {
    display: inline-flex;
  }

  /* The panel menu carries Login/Register; the inline pair would only crowd
     the compact utility row on phones. */
  .landing__login,
  .landing__cta {
    display: none;
  }
}

@media (max-width: 30rem) {
  .landing__header-inner {
    gap: var(--space-3);
    /* Drop the brand floor: wordmark, utility controls and the menu toggle
       must share one 320px row. */
    --brand-min-width: 0;
    padding-inline: var(--space-3);
  }

  .landing__footer {
    padding-inline: var(--space-4);
  }
}
</style>
