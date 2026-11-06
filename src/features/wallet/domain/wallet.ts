import type { Result } from '@/shared/domain'

/**
 * The authenticated account's electronic wallet balance. `amount` is a decimal
 * string so the UI can format it without losing precision to floating point.
 */
export interface WalletBalance {
  readonly amount: string
  readonly currencyCode: string
}

/** Stable error codes returned by a wallet adapter. */
export type WalletServiceErrorCode = 'unavailable' | 'load_failed'

export interface WalletServiceError {
  readonly code: WalletServiceErrorCode
}

export type WalletServiceResult = Result<WalletBalance, WalletServiceError>

/**
 * UI-independent wallet operations. A future HTTP adapter implements this
 * contract without exposing endpoint, payload, or response details to the UI.
 */
export interface WalletService {
  getBalance(): Promise<WalletServiceResult>
}
