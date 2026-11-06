import { ok } from '@/shared/domain'

import type { WalletBalance, WalletService, WalletServiceResult } from '../domain/wallet'

/**
 * Development placeholder — the ONLY place where the sample balance is defined.
 * The wallet backend does not exist yet, so this fixed amount stands in for the
 * user's real balance and is rendered by the header chip exactly like a real
 * one. Connecting the real wallet later means implementing an HTTP
 * `WalletService` and rebinding it in the composition root
 * (src/app/di/container.ts) — the UI needs no changes.
 */
export const PLACEHOLDER_WALLET_BALANCE: WalletBalance = {
  amount: '1250000',
  currencyCode: 'UZS',
}

export const createPlaceholderWalletService = (): WalletService => ({
  getBalance: async (): Promise<WalletServiceResult> => ok(PLACEHOLDER_WALLET_BALANCE),
})
