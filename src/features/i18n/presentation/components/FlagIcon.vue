<script setup lang="ts">
import { computed } from 'vue'

import { flagFor } from './flags'

const { code, rectangular = false } = defineProps<{
  code: string
  /** Rectangular 3:2 variant (authenticated Settings); the default stays round. */
  rectangular?: boolean
}>()

const rects = computed(() => flagFor(code))
// Neutral fallback: the code's first letter, in the same circle.
const letter = computed(() => code.trim().charAt(0).toUpperCase() || '?')
</script>

<template>
  <span
    class="flag"
    :class="{ 'flag--fallback': rects === null, 'flag--rect': rectangular }"
    aria-hidden="true"
  >
    <svg
      v-if="rects"
      class="flag__svg"
      viewBox="0 0 20 20"
      preserveAspectRatio="none"
      shape-rendering="crispEdges"
      focusable="false"
    >
      <rect
        v-for="(rect, index) in rects"
        :key="index"
        :x="rect.x"
        :y="rect.y"
        :width="rect.w"
        :height="rect.h"
        :fill="rect.fill"
      />
    </svg>
    <span v-else class="flag__letter">{{ letter }}</span>
  </span>
</template>

<style scoped>
.flag {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-flag);
  overflow: hidden;
  background-color: var(--color-surface);
}

/* Thin border on top of the artwork so the white band of `ru` stays visible on
   a light background. Drawn as an overlay so the artwork still fills the circle. */
.flag::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid var(--color-border);
  border-radius: inherit;
  pointer-events: none;
}

.flag__svg {
  display: block;
  width: 100%;
  height: 100%;
}

.flag--fallback {
  background-color: var(--color-bg);
}

/* Rectangular variant (Settings → Language): 3:2 with a subtle radius. Opt-in,
   so the anonymous selector keeps its 20x20 round flags. The border overlay
   inherits this radius. */
.flag--rect {
  width: 21px;
  height: 14px;
  border-radius: 2px;
}

.flag__letter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: var(--color-text-muted);
}
</style>
