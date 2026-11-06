<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import WalletBalanceIndicator from './WalletBalanceIndicator.vue'
import UserMenu from './UserMenu.vue'

/**
 * The header shared by every authenticated page (both workspaces): global
 * search, wallet balance (display-only), notification control and profile. The
 * MFIN wordmark belongs to the sidebar's top row. Theme and language switching
 * live in Settings, not here. The bell is display-only — no fake destinations;
 * the profile control is the shared UserMenu (account info and Logout).
 */
const { t } = useI18n()

// ── Search: a real input; ⌘K / Ctrl+K focuses it ────────────────────────────
const searchQuery = ref('')
const searchRef = ref<HTMLInputElement | null>(null)

const onWindowKeydown = (event: KeyboardEvent): void => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchRef.value?.focus()
  }
}

onMounted(() => window.addEventListener('keydown', onWindowKeydown))

onBeforeUnmount(() => window.removeEventListener('keydown', onWindowKeydown))
</script>

<template>
  <header class="shead">
    <div class="shead__search">
      <svg class="shead__search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        ref="searchRef"
        v-model="searchQuery"
        class="shead__search-input"
        type="search"
        name="global-search"
        autocomplete="off"
        :placeholder="t('settings.search_placeholder')"
        :aria-label="t('settings.search_placeholder')"
      />
      <kbd class="shead__kbd" aria-hidden="true">⌘ K</kbd>
    </div>

    <div class="shead__side">
      <WalletBalanceIndicator />

      <span class="shead__bell" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        <span class="shead__bell-dot"></span>
      </span>

      <span class="shead__divider" aria-hidden="true"></span>

      <UserMenu />
    </div>
  </header>
</template>

<style scoped>
.shead {
  display: flex;
  flex: none;
  align-items: center;
  height: 66px;
  padding: 0 28px;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--color-text);
}

/* ── Search ─────────────────────────────────────────────────────────────── */
.shead__search {
  position: relative;
  flex: 0 1 565px;
  width: 565px;
  min-width: 0;
  max-width: 100%;
}

.shead__search-icon {
  position: absolute;
  top: 50%;
  left: 12px;
  width: 17px;
  height: 17px;
  fill: none;
  stroke: var(--color-text-muted);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transform: translateY(-50%);
}

.shead__search-input {
  box-sizing: border-box;
  width: 100%;
  height: 38px;
  padding: 0 64px 0 38px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-surface);
  appearance: none;
  font: inherit;
  font-size: 14px;
  color: var(--color-text);
}

.shead__search-input::placeholder {
  color: var(--color-text-muted);
}

.shead__search-input::-webkit-search-cancel-button {
  display: none;
}

.shead__kbd {
  position: absolute;
  top: 50%;
  right: 12px;
  font-family: inherit;
  font-size: 12px;
  color: var(--color-text-muted);
  pointer-events: none;
  transform: translateY(-50%);
}

/* ── Right-side controls ────────────────────────────────────────────────── */
.shead__side {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-left: auto;
}

.shead__bell {
  position: relative;
  display: inline-flex;
}

.shead__bell svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: var(--color-text);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Not a token: the notification dot's red is unique in the design. */
.shead__bell-dot {
  position: absolute;
  top: -1px;
  right: -1px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #f04444;
}

.shead__divider {
  width: 1px;
  height: 26px;
  background-color: var(--color-border);
}

/* ── Mobile: keep the profile control; the fixed hamburger needs room at the
     left, and the search/bell pair is a desktop affordance ── */
@media (max-width: 48rem) {
  .shead {
    padding: 0 16px 0 76px;
  }

  .shead__search,
  .shead__bell,
  .shead__divider {
    display: none;
  }
}
</style>
