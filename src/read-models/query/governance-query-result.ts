import type { GovernanceQueryError } from './governance-query-errors'

export type GovernanceQueryResult<T> =
  | { ok: true; value: T; warnings?: string[] }
  | { ok: false; error: GovernanceQueryError }

export const queryOk = <T>(value: T, warnings?: string[]): GovernanceQueryResult<T> => ({
  ok: true,
  value,
  ...(warnings?.length ? { warnings } : {}),
})

export const queryErr = <T = never>(error: GovernanceQueryError): GovernanceQueryResult<T> => ({ ok: false, error })
