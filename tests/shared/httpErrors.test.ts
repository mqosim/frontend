/**
 * The register-start conflict is the only 409 in the contract that carries
 * field-level `problems`; these tests pin that the shared mapper preserves them
 * instead of reducing the error to its status and code.
 */
import { describe, expect, test } from 'bun:test'

import { toAppError } from '../../src/shared/infrastructure/http/errors'

const conflictBody = (problems?: readonly { readonly path: string; readonly code: string }[]) => ({
  error: {
    code: 'identifier_already_registered',
    message: 'taken',
    ...(problems === undefined ? {} : { problems }),
  },
})

describe('toAppError 409', () => {
  test('preserves one field problem', () => {
    const error = toAppError(
      new Response(null, { status: 409 }),
      conflictBody([{ path: 'email', code: 'already_registered' }]),
    )

    expect(error.kind).toBe('Conflict')
    if (error.kind !== 'Conflict') throw new Error('expected Conflict')
    expect(error.code).toBe('identifier_already_registered')
    expect(error.problems).toEqual([{ path: 'email', code: 'already_registered' }])
  })

  test('preserves both field problems', () => {
    const error = toAppError(
      new Response(null, { status: 409 }),
      conflictBody([
        { path: 'email', code: 'already_registered' },
        { path: 'phone', code: 'already_registered' },
      ]),
    )

    expect(error.kind).toBe('Conflict')
    if (error.kind !== 'Conflict') throw new Error('expected Conflict')
    expect(error.problems).toEqual([
      { path: 'email', code: 'already_registered' },
      { path: 'phone', code: 'already_registered' },
    ])
  })

  test('leaves problems absent when the body has none', () => {
    const error = toAppError(new Response(null, { status: 409 }), conflictBody())

    expect(error.kind).toBe('Conflict')
    if (error.kind !== 'Conflict') throw new Error('expected Conflict')
    expect(error.problems).toBeUndefined()
  })
})
