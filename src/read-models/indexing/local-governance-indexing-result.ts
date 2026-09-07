import type { LocalGovernanceIndexingError } from './local-governance-indexing-errors'
import type { LocalGovernanceIndexCheckpoint, LocalGovernanceIndexingStats } from './local-governance-indexing-types'

export type LocalGovernanceIndexingResult<T> =
  | {
      ok: true
      value: T
      checkpoint: LocalGovernanceIndexCheckpoint
      stats: LocalGovernanceIndexingStats
      warnings?: string[]
    }
  | {
      ok: false
      error: LocalGovernanceIndexingError
      checkpoint?: LocalGovernanceIndexCheckpoint
      stats?: LocalGovernanceIndexingStats
    }

export const localIndexingOk = <T>(
  value: T,
  checkpoint: LocalGovernanceIndexCheckpoint,
  stats: LocalGovernanceIndexingStats,
  warnings?: string[],
): LocalGovernanceIndexingResult<T> => ({
  ok: true,
  value,
  checkpoint,
  stats,
  ...(warnings?.length ? { warnings } : {}),
})

export const localIndexingErr = <T = never>(
  error: LocalGovernanceIndexingError,
  checkpoint?: LocalGovernanceIndexCheckpoint,
  stats?: LocalGovernanceIndexingStats,
): LocalGovernanceIndexingResult<T> => ({
  ok: false,
  error,
  ...(checkpoint ? { checkpoint } : {}),
  ...(stats ? { stats } : {}),
})
