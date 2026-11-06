<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { formatWalletAmount, useWalletService } from '@/features/wallet'
import type { WalletBalance } from '@/features/wallet'

/**
 * Display-only wallet balance for the org header, rendered to the left of the
 * notification bell. The injected service currently supplies a fixed
 * development placeholder (see the wallet feature's placeholder adapter); the
 * chip renders it like a real balance and keeps the muted `—` fallback for
 * adapters that fail to load.
 */
const { t, locale } = useI18n()

const service = useWalletService()

const balance = ref<WalletBalance | null>(null)

onMounted(() => {
  void service.getBalance().then((result) => {
    if (result.ok) balance.value = result.value
  })
})

const amountText = computed(() => {
  if (balance.value === null) return null
  return formatWalletAmount(balance.value.amount, balance.value.currencyCode, locale.value)
})

const title = computed(() =>
  amountText.value === null
    ? t('wallet.balance_unavailable')
    : `${t('wallet.balance')}: ${amountText.value}`,
)
</script>

<template>
  <span class="wallet-chip" :class="{ 'wallet-chip--muted': amountText === null }" :title="title">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
    <span class="wallet-chip__amount">{{ amountText ?? '—' }}</span>
  </span>
</template>

<style scoped>
.wallet-chip {
  display: inline-flex;
  flex: none;
  gap: 7px;
  align-items: center;
  max-width: 14rem;
  color: var(--color-text);
  white-space: nowrap;
}

.wallet-chip svg {
  flex: none;
  width: 20px;
  height: 20px;
  fill: none;
  stroke: var(--color-text);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.wallet-chip__amount {
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
}

.wallet-chip--muted {
  color: var(--color-text-muted);
}

.wallet-chip--muted svg {
  stroke: var(--color-text-muted);
}

/* Matches the bell and divider: a desktop affordance hidden beside the fixed
   mobile hamburger. */
@media (max-width: 48rem) {
  .wallet-chip {
    display: none;
  }
}
</style>
