import type { InjectionKey } from 'vue'

import type { WalletService } from '../domain/wallet'

/** Provided by the composition root and replaceable with a real HTTP adapter. */
export const WalletServiceKey: InjectionKey<WalletService> = Symbol('wallet-service')
