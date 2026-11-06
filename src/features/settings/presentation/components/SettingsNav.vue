<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

/**
 * The secondary Settings navigation (the reference's narrow column beside the
 * module menu). Profile, Account Security, Appearance and Language are real
 * sections; the remaining Notifications row is a plain placeholder — never a
 * fake link or button — until its section exists. Every link addresses the single
 * `settings` route's optional `section` param, so the route name (and with it the
 * module menu's active state) never changes.
 */
const { t } = useI18n()
const route = useRoute()

// An absent optional param reads as `undefined` (empty string on some matchers),
// so both "no section" cases count as Account Security.
const sectionParam = computed(() => {
  const value = route.params.section
  return Array.isArray(value) ? value[0] : value
})
const isProfileActive = computed(() => sectionParam.value === 'profile')
const isSecurityActive = computed(() => !sectionParam.value)
const isAppearanceActive = computed(() => sectionParam.value === 'appearance')
const isLanguageActive = computed(() => sectionParam.value === 'language')
</script>

<template>
  <nav class="snav" :aria-label="t('action.settings')">
    <ul class="snav__list">
      <li class="snav__item">
        <RouterLink
          class="snav__row"
          :class="{ 'snav__row--active': isProfileActive }"
          :to="{ name: 'settings', params: { section: 'profile' } }"
          :aria-current="isProfileActive ? 'page' : undefined"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M18 20a6 6 0 0 0-12 0" />
            <circle cx="12" cy="10" r="4" />
          </svg>
          <span>{{ t('settings.nav_profile') }}</span>
        </RouterLink>
      </li>

      <li class="snav__item">
        <RouterLink
          class="snav__row"
          :class="{ 'snav__row--active': isSecurityActive }"
          :to="{ name: 'settings' }"
          :aria-current="isSecurityActive ? 'page' : undefined"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
            />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>{{ t('settings.security_title') }}</span>
        </RouterLink>
      </li>

      <li class="snav__item">
        <span class="snav__row">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span>{{ t('settings.nav_notifications') }}</span>
        </span>
      </li>

      <li class="snav__item">
        <RouterLink
          class="snav__row"
          :class="{ 'snav__row--active': isAppearanceActive }"
          :to="{ name: 'settings', params: { section: 'appearance' } }"
          :aria-current="isAppearanceActive ? 'page' : undefined"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" stroke="none" />
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" stroke="none" />
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" stroke="none" />
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" stroke="none" />
            <path
              d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"
            />
          </svg>
          <span>{{ t('settings.nav_appearance') }}</span>
        </RouterLink>
      </li>

      <li class="snav__item">
        <RouterLink
          class="snav__row"
          :class="{ 'snav__row--active': isLanguageActive }"
          :to="{ name: 'settings', params: { section: 'language' } }"
          :aria-current="isLanguageActive ? 'page' : undefined"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
          <span>{{ t('settings.nav_language') }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.snav__list {
  width: 203px;
  max-width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.snav__row {
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  min-height: 43px;
  padding: 0 13px;
  border-radius: 7px;
  font-size: 14px;
  color: var(--color-text);
}

.snav__row svg {
  flex: none;
  width: 18px;
  height: 18px;
  fill: none;
  stroke: var(--color-text-muted);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.snav__row--active {
  background-color: var(--color-info-surface);
  color: var(--color-primary);
  font-weight: 500;
}

.snav__row--active svg {
  stroke: var(--color-primary);
}
</style>
