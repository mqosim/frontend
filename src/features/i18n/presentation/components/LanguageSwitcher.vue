<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { I18nFeatureKey } from '../di'
import { useLocaleStore } from '../stores/localeStore'
import FlagIcon from './FlagIcon.vue'
import { languageLabelFor } from './languageLabels'

const { t } = useI18n()
const store = useLocaleStore()
const route = useRoute()
const i18nFeature = inject(I18nFeatureKey)

// The anonymous authentication flow (login/register/workspace/system-login) and
// the landing header opt in: the collapsed selector shows the selected language
// with a chevron, hover opens the dropdown, and the menu lists the alternatives
// (uz/uzc first, then the rest). Other surfaces (authenticated SYSTEM area)
// keep the API order and its tick.
const props = defineProps<{
  prioritizeSelected?: boolean
  fullLabels?: boolean
  /**
   * Settings variant: render the menu in the normal flow so it pushes the content
   * below down, and open on click only (hover-open would shift the page on hover).
   */
  inlineMenu?: boolean
  /**
   * Code shown as the selected language and excluded from the menu. Defaults to
   * the active locale; Settings passes its unsaved draft so the choice can be held
   * as a pending change until it is saved (the component then never mutates the
   * store itself and only emits `select`).
   */
  selected?: string
  /**
   * Rectangular 3:2 flags (authenticated Settings → Language). Surfaces that omit
   * it — the anonymous authentication selector, the SYSTEM area, the public
   * landing — keep the default 20x20 round flags.
   */
  rectFlags?: boolean
}>()
// Emitted after the locale has switched, so callers that need to persist the
// choice elsewhere (the authenticated Settings page syncs it to the account) can
// react without owning the switching behaviour.
const emit = defineEmits<{ select: [code: string] }>()

const UZBEK_CODES = ['uz', 'uzc'] as const

const languages = computed(() => store.languages)

// Controlled mode (Settings): the caller owns the shown/excluded code and the
// component stays store-agnostic, emitting `select` instead of switching. When
// no `selected` is passed the active locale drives everything, as before.
const selectedCode = computed(() => props.selected ?? store.locale)
const currentLabel = computed(() => languageLabelFor(selectedCode.value))

// The authenticated Settings page shows the full language names (e.g. "English")
// instead of the short labels used in the compact header control. The name comes
// from the active-languages API, so no language list is duplicated here.
const fullNameFor = (code: string): string | null => {
  const name = languages.value.find((language) => language.code === code)?.name
  return name !== undefined && name.trim().length > 0 ? name : null
}

const currentText = computed(() =>
  props.fullLabels === true
    ? (fullNameFor(selectedCode.value) ?? currentLabel.value.label)
    : currentLabel.value.label,
)

const optionText = (code: string): string =>
  props.fullLabels === true
    ? (fullNameFor(code) ?? languageLabelFor(code).label)
    : languageLabelFor(code).label

// The unauthenticated selector shows the selected language in the collapsed
// trigger, so the dropdown lists only the alternatives: uz/uzc first, then the
// remaining languages in their original order. Recomputed whenever the locale
// or the list changes, so switching language updates the list immediately.
const orderedLanguages = computed(() => {
  const all = languages.value
  if (props.prioritizeSelected !== true) return all

  const alternatives = all.filter((language) => language.code !== selectedCode.value)
  const uzbekSet = new Set<string>(UZBEK_CODES)
  const uzbek = UZBEK_CODES.flatMap((code) =>
    alternatives.filter((language) => language.code === code),
  )
  const rest = alternatives.filter((language) => !uzbekSet.has(language.code))
  return [...uzbek, ...rest]
})

// Neither a label nor the language names are visible, so the control and every
// option get an accessible name from the phrase plus the API name. The visible
// short label is kept in the name too (WCAG 2.5.3 Label in Name).
const labelFor = (code: string): string => {
  const name = store.languages.find((language) => language.code === code)?.name
  const short = languageLabelFor(code).label
  return name === undefined
    ? `${t('common.language')}: ${short}`
    : `${t('common.language')}: ${name} (${short})`
}
const triggerLabel = computed(() => labelFor(selectedCode.value))

const isOpen = ref(false)
const triggerRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLUListElement | null>(null)

const optionButtons = (): HTMLButtonElement[] =>
  menuRef.value === null
    ? []
    : Array.from(menuRef.value.querySelectorAll<HTMLButtonElement>('button'))

const focusOption = (index: number): void => {
  const buttons = optionButtons()
  if (buttons.length === 0) return
  buttons[(index + buttons.length) % buttons.length]?.focus()
}

// The menu is `position: fixed` so header overflow can never clip it; it is
// clamped to the viewport, opening leftwards from the trigger when needed.
const positionMenu = (): void => {
  // The inline menu (Settings) lives in the normal flow, so there is nothing to
  // position and the styles it sets would break that layout.
  if (props.inlineMenu === true) return
  const trigger = triggerRef.value
  const menu = menuRef.value
  if (trigger === null || menu === null) return
  const rect = trigger.getBoundingClientRect()

  // Unauthenticated selector: attach the menu to the trigger (shared edges, no
  // gap) so the two read as a single connected control.
  if (props.prioritizeSelected) {
    menu.style.left = `${rect.left}px`
    menu.style.width = `${rect.width}px`
    menu.style.top = `${rect.bottom}px`
    menu.style.visibility = 'visible'
    return
  }

  const margin = 8
  const width = menu.offsetWidth
  const maxLeft = window.innerWidth - width - margin
  const left = Math.min(Math.max(rect.right - width, margin), Math.max(margin, maxLeft))
  menu.style.left = `${left}px`
  menu.style.top = `${rect.bottom + 4}px`
  menu.style.visibility = 'visible'
}

// Hover-open applies to the unauthenticated selector only, and only on devices
// with a real pointer. The short close delay bridges the gap between the trigger
// and the fixed menu so moving the pointer onto an item never flickers it shut.
const HOVER_CLOSE_DELAY = 120
const hoverCapable = typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

// Hover-open is for the header selector only; the inline (Settings) variant opens
// on click/tap so it never shifts the page while the pointer moves.
const hoverEnabled = computed(() => props.prioritizeSelected === true && props.inlineMenu !== true)

let closeTimer: number | undefined

const cancelClose = (): void => {
  if (closeTimer === undefined) return
  window.clearTimeout(closeTimer)
  closeTimer = undefined
}

const onHoverEnter = (): void => {
  if (!hoverEnabled.value || !hoverCapable) return
  cancelClose()
  if (!isOpen.value) void openMenu(false)
}

const onHoverLeave = (): void => {
  if (!hoverEnabled.value || !hoverCapable) return
  cancelClose()
  closeTimer = window.setTimeout(() => {
    closeTimer = undefined
    close(false)
  }, HOVER_CLOSE_DELAY)
}

// `focus` is false for hover-open: sliding the mouse over the control must not
// steal focus or scroll the page.
const openMenu = async (focus = true): Promise<void> => {
  isOpen.value = true
  await nextTick()
  positionMenu()
  if (!focus) return
  const buttons = optionButtons()
  const selected = buttons.findIndex((button) => button.dataset.code === selectedCode.value)
  buttons[selected >= 0 ? selected : 0]?.focus()
}

const close = (returnFocus: boolean): void => {
  cancelClose()
  if (!isOpen.value) return
  isOpen.value = false
  if (returnFocus) triggerRef.value?.focus()
}

// The control now lives at the app root and persists across navigations, so an
// open menu must be closed explicitly when the route changes.
watch(
  () => route.fullPath,
  () => close(false),
)

const select = async (code: string): Promise<void> => {
  close(true)
  if (code === selectedCode.value) return
  // Controlled mode: the caller (Settings) holds the choice as an unsaved draft,
  // so we never touch the store here and leave applying/persisting to it.
  if (props.selected !== undefined) {
    emit('select', code)
    return
  }
  store.setLocale(code)
  const pages = [...(route.meta.translationPages ?? []), 'common']
  await i18nFeature?.ensure(code, pages)
  emit('select', code)
}

const onTriggerClick = (): void => {
  if (isOpen.value) close(true)
  else void openMenu()
}

// Enter/Space open the menu through the button's native click; arrows and
// Escape are handled here.
const onTriggerKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    void openMenu()
  } else if (event.key === 'Escape') {
    close(false)
  }
}

const onMenuKeydown = (event: KeyboardEvent): void => {
  const buttons = optionButtons()
  const index = buttons.findIndex((button) => button === document.activeElement)
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusOption(index + 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      focusOption(index - 1)
      break
    case 'Home':
      event.preventDefault()
      focusOption(0)
      break
    case 'End':
      event.preventDefault()
      focusOption(buttons.length - 1)
      break
    case 'Escape':
      event.preventDefault()
      close(true)
      break
    case 'Tab':
      close(false)
      break
    default:
      break
  }
}

const onDocumentPointerDown = (event: PointerEvent): void => {
  const target = event.target
  if (!(target instanceof Node)) return
  if (triggerRef.value?.contains(target) === true || menuRef.value?.contains(target) === true)
    return
  close(false)
}

const onWindowScroll = (): void => close(false)

const addListeners = (): void => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  // An inline menu is not positioned against the viewport, so it needs neither
  // re-positioning on resize nor closing on scroll.
  if (props.inlineMenu === true) return
  window.addEventListener('resize', positionMenu)
  window.addEventListener('scroll', onWindowScroll, true)
}

const removeListeners = (): void => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  window.removeEventListener('resize', positionMenu)
  window.removeEventListener('scroll', onWindowScroll, true)
}

watch(isOpen, (open) => (open ? addListeners() : removeListeners()))

onMounted(() => {
  void i18nFeature?.loadLanguages()
})

onBeforeUnmount(() => {
  removeListeners()
  cancelClose()
})
</script>

<template>
  <div
    v-if="languages.length > 0"
    class="switcher"
    :class="{
      'switcher--attached': prioritizeSelected && isOpen,
      'switcher--inline': inlineMenu,
    }"
    @mouseenter="onHoverEnter"
    @mouseleave="onHoverLeave"
  >
    <button
      ref="triggerRef"
      type="button"
      class="switcher__trigger"
      :aria-label="triggerLabel"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      @click="onTriggerClick"
      @keydown="onTriggerKeydown"
    >
      <FlagIcon :code="selectedCode" :rectangular="rectFlags" />
      <span class="switcher__code" :lang="currentLabel.lang">{{ currentText }}</span>
      <span v-if="prioritizeSelected" class="switcher__chevron" aria-hidden="true">⌄</span>
    </button>

    <ul
      v-if="isOpen"
      ref="menuRef"
      class="switcher__menu"
      role="menu"
      :aria-label="t('common.language')"
      @keydown="onMenuKeydown"
    >
      <li v-for="language in orderedLanguages" :key="language.code" role="none">
        <button
          type="button"
          role="menuitemradio"
          class="switcher__option"
          :class="{
            'switcher__option--active': !prioritizeSelected && language.code === selectedCode,
          }"
          :aria-label="labelFor(language.code)"
          :aria-checked="language.code === selectedCode"
          :data-code="language.code"
          @click="select(language.code)"
        >
          <FlagIcon :code="language.code" :rectangular="rectFlags" />
          <span class="switcher__code" :lang="languageLabelFor(language.code).lang">
            {{ optionText(language.code) }}
          </span>
          <svg
            v-if="!prioritizeSelected && language.code === selectedCode"
            class="switcher__check"
            viewBox="0 0 12 12"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M2 6.5 4.5 9 10 3"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.switcher {
  display: inline-flex;
}

/* Settings variant: the menu participates in the normal flow, so opening it
   pushes the content below down instead of covering it. */
.switcher--inline {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
}

.switcher--inline .switcher__menu {
  position: static;
  width: auto;
  visibility: visible;
}

.switcher__trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: var(--global-controls-height);
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
}

.switcher__trigger:hover {
  background-color: var(--color-bg);
}

.switcher__code {
  letter-spacing: 0.04em;
}

.switcher__chevron {
  /* One step above the label: the ⌄ glyph renders optically small next to the
     flag, so a subtle bump keeps it legible without becoming dominant. */
  font-size: var(--font-size-md);
  line-height: 1;
  color: var(--color-text-muted);
}

.switcher__menu {
  position: fixed;
  z-index: var(--z-menu);
  width: max-content;
  max-width: calc(100vw - var(--space-3) * 2);
  margin: 0;
  padding: var(--space-1);
  list-style: none;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-card);
  /* Shown once positioned, so it never flashes at the wrong spot. */
  visibility: hidden;
}

/* Attached variant (unauthenticated selector): the menu continues the trigger,
   so the shared edge draws no border/divider and the outer corners stay round. */
.switcher--attached .switcher__trigger {
  border-bottom: 0;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.switcher--attached .switcher__menu {
  border-top: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.switcher__option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  /* Guarantee a 44px touch target for each language row. */
  min-height: 2.75rem;
  padding: var(--space-2);
  border: 0;
  border-radius: var(--radius-sm);
  background-color: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-sm);
  text-align: left;
  cursor: pointer;
}

.switcher__option:hover {
  background-color: var(--color-bg);
}

.switcher__option--active {
  font-weight: 650;
}

.switcher__check {
  width: 0.75rem;
  height: 0.75rem;
  margin-left: auto;
  color: var(--color-primary);
}
</style>
