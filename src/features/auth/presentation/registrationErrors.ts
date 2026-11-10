import type { AppError } from '@/shared/domain'

/** i18n keys for the two register-start identifiers. */
export type RegisterStartFieldErrors = Partial<Record<'email' | 'phone', string>>

/**
 * Maps the contract's `409 identifier_already_registered` problems to field
 * error keys. The paths are the bare `email` and `phone`, and the backend
 * returns both when both identifiers are taken.
 *
 * An error without matching problems yields an empty map, so the caller can
 * fall back to the shared error copy.
 */
export const toRegisterStartFieldErrors = (error: AppError): RegisterStartFieldErrors => {
  if (error.kind !== 'Conflict' || error.code !== 'identifier_already_registered') return {}
  if (error.problems === undefined) return {}

  const fieldErrors: RegisterStartFieldErrors = {}
  for (const problem of error.problems) {
    if (problem.code !== 'already_registered') continue
    if (problem.path === 'email') fieldErrors.email = 'validation.email_already_registered'
    if (problem.path === 'phone') fieldErrors.phone = 'validation.phone_already_registered'
  }
  return fieldErrors
}
