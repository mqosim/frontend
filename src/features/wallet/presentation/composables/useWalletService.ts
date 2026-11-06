import { inject } from 'vue'

import { WalletServiceKey } from '../di'
import type { WalletService } from '../../domain/wallet'

export const useWalletService = (): WalletService => {
  const service = inject(WalletServiceKey)
  if (service === undefined) {
    throw new Error('Wallet service was not provided by the composition root')
  }
  return service
}
