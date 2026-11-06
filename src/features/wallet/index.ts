// Public surface of the wallet feature. Other features and the composition
// root must import from here, never from a feature's internal layers.
export { WalletServiceKey } from './presentation/di'
export { useWalletService } from './presentation/composables/useWalletService'
export { createPlaceholderWalletService } from './infrastructure/placeholderWalletService'
export { formatWalletAmount } from './domain/formatWalletAmount'
export type {
  WalletBalance,
  WalletService,
  WalletServiceError,
  WalletServiceErrorCode,
  WalletServiceResult,
} from './domain/wallet'
