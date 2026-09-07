import type { RepositoryError } from './repository-errors'

export type RepositoryResult<T> = { ok: true; value: T } | { ok: false; error: RepositoryError }

export const ok = <T>(value: T): RepositoryResult<T> => ({ ok: true, value })

export const err = <T = never>(error: RepositoryError): RepositoryResult<T> => ({ ok: false, error })
