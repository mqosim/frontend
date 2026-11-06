import type { Principal } from '@/shared/domain'

export interface SystemLoginInput {
  readonly email: string
  readonly password: string
}

/** A complete SYSTEM session (never pending: SYSTEM has no workspace step). */
export interface SystemSession {
  readonly principal: Principal
}
