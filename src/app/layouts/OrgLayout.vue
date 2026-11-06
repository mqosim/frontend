<script setup lang="ts">
import { OrgShell } from '@/features/org-dashboard'
</script>

<template>
  <!-- The ORG chrome: module menu + shared header + sub-panel + content column,
       with the routed page in the content slot. -->
  <OrgShell>
    <template #header>
      <slot name="header" />
    </template>
    <slot />
  </OrgShell>
</template>
