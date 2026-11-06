<script setup lang="ts">
import { computed } from 'vue'

import { FALLBACK_ICON, iconFor } from '../icons/moduleIcons'

const props = defineProps<{ id: string; size?: number }>()

// Unknown ids fall back to a neutral shape, so a new module never breaks the UI.
const shape = computed(() => iconFor(props.id) ?? FALLBACK_ICON)
// Optional per-call override; otherwise the `--icon-size` token sets the size.
const sizeStyle = computed(() =>
  props.size === undefined ? undefined : { width: `${props.size}px`, height: `${props.size}px` },
)
</script>

<template>
  <!-- Decorative: the menu item's own text/label carries the accessible name. -->
  <svg
    class="module-icon"
    viewBox="0 0 24 24"
    :style="sizeStyle"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <rect v-for="(rect, index) in shape.rects" :key="`r${index}`" v-bind="rect" />
    <circle v-for="(circle, index) in shape.circles" :key="`c${index}`" v-bind="circle" />
    <path v-for="(d, index) in shape.paths" :key="`p${index}`" :d="d" />
  </svg>
</template>

<style scoped>
.module-icon {
  display: block;
  flex-shrink: 0;
  width: var(--icon-size);
  height: var(--icon-size);
}
</style>
