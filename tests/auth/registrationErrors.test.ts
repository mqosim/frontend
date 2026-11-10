/**
 * The register-start 409 maps bare `email`/`phone` problem paths to field copy.
 * These tests go through the real HTTP error mapper so the two layers stay
 * wired together.
 */
import { describe, expect, test } from 'bun:test'

import { toRegisterStartFieldErrors } from '../../src/features/auth/presentation/registrationErrors'
import { toAppError } from '../../src/shared/infrastructure/http/errors'

const conflict = (problems: readonly { readonly path: string; readonly code: string }[]) =>
  toAppError(new Response(null, { status: 409 }), {
    error: { code: 'identifier_already_registered', message: 'taken', problems },
  })

describe('toRegisterStartFieldErrors', () => {
  test('maps one taken identifier to its field key', () => {
    expect(
      toRegisterStartFieldErrors(conflict([{ path: 'email', code: 'already_registered' }])),
    ).toEqual({ email: 'validation.email_already_registered' })
  })

  test('maps both taken identifiers', () => {
    expect(
      toRegisterStartFieldErrors(
        conflict([
          { path: 'email', code: 'already_registered' },
          { path: 'phone', code: 'already_registered' },
        ]),
      ),
    ).toEqual({
      email: 'validation.email_already_registered',
      phone: 'validation.phone_already_registered',
    })
  })

  test('ignores unrelated problem codes and paths', () => {
    expect(
      toRegisterStartFieldErrors(
        conflict([
          { path: 'email', code: 'invalid' },
          { path: 'body.email', code: 'already_registered' },
        ]),
      ),
    ).toEqual({})
  })

  test('returns an empty map for a conflict without problems', () => {
    expect(
      toRegisterStartFieldErrors(
        toAppError(new Response(null, { status: 409 }), {
          error: { code: 'identifier_already_registered', message: 'taken' },
        }),
      ),
    ).toEqual({})
  })
})
