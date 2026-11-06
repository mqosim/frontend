import type { InjectionKey } from 'vue'

import type { AvatarService } from '../domain/avatar'

/** Provided by the composition root and replaceable with a real HTTP adapter. */
export const AvatarServiceKey: InjectionKey<AvatarService> = Symbol('avatar-service')
