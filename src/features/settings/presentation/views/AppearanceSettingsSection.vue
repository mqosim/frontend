<script setup lang="ts">
import { useId } from 'vue'
import { useI18n } from 'vue-i18n'

import { useTheme } from '@/shared/presentation/theme/useTheme'
import type { Theme } from '@/shared/presentation/theme/useTheme'

/**
 * The Appearance section of the Settings page. The app's single appearance
 * control is the theme, so the active choice is rendered as two selectable tiles.
 * The standalone authenticated header control is absent; selecting a tile applies
 * and persists immediately through the shared theme store — the same module-level
 * state, `app.theme` key and pre-paint resolution the rest of the app uses, so
 * there is no second theme state to keep in sync.
 */
const { t } = useI18n()
const { theme, setTheme } = useTheme()
const titleId = useId()

const options: readonly { value: Theme; labelKey: string }[] = [
  { value: 'light', labelKey: 'settings.theme_light' },
  { value: 'dark', labelKey: 'settings.theme_dark' },
]
</script>

<template>
  <section class="appearance-section" :aria-labelledby="titleId">
    <h2 :id="titleId" class="appearance-section__title">{{ t('settings.nav_appearance') }}</h2>
    <p class="appearance-section__hint">{{ t('settings.appearance_hint') }}</p>

    <div class="appearance-section__card">
      <div
        class="appearance-section__options"
        role="radiogroup"
        :aria-label="t('settings.nav_appearance')"
      >
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          role="radio"
          class="appearance-section__option"
          :class="{ 'appearance-section__option--active': theme === option.value }"
          :aria-checked="theme === option.value"
          @click="setTheme(option.value)"
        >
          <svg
            class="appearance-section__icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <template v-if="option.value === 'light'">
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
              />
            </template>
            <path v-else d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
          </svg>
          <span class="appearance-section__label">{{ t(option.labelKey) }}</span>
          <svg
            v-if="theme === option.value"
            class="appearance-section__check"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m5 13 4 4 10-10" />
          </svg>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.appearance-section {
  margin-top: 16px;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background-color: var(--color-surface);
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.appearance-section__title {
  margin: 0;
  font-size: 19px;
  font-weight: 600;
  color: var(--color-text);
}

.appearance-section__hint {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

/* Inner card matching the security cards' chrome, so the box-in-box structure
   reads the same as the other sections. */
.appearance-section__card {
  margin-top: 20px;
  padding: 22px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background-color: var(--color-surface);
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.appearance-section__options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 23px;
  row-gap: 16px;
}

.appearance-section__option {
  display: flex;
  align-items: center;
  gap: 10px;
  box-sizing: border-box;
  min-height: 43px;
  padding: 0 13px;
  border: 1px solid var(--color-border);
  border-radius: 7px;
  background-color: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}

.appearance-section__option:hover {
  background-color: var(--color-bg);
}

.appearance-section__option--active {
  border-color: var(--color-primary);
  background-color: var(--color-info-surface);
  color: var(--color-primary);
}

.appearance-section__icon {
  flex: none;
  width: 18px;
  height: 18px;
  fill: none;
  stroke: var(--color-text-muted);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.appearance-section__option--active .appearance-section__icon {
  stroke: var(--color-primary);
}

.appearance-section__label {
  flex: 1;
}

.appearance-section__check {
  flex: none;
  width: 16px;
  height: 16px;
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 47.99rem) {
  .appearance-section__options {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
