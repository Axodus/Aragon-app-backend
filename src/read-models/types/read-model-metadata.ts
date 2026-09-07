export type ReadModelFreshness = 'fresh' | 'stale' | 'rebuilding' | 'unknown'
export type ReadModelConsistency = 'strong' | 'eventual' | 'snapshot'

export interface ReadModelMetadata {
  readModelId: string
  tenantId: string
  sourceVersion: string
  generatedAt: string
  lastSourceEventAt: string | null
  freshness: ReadModelFreshness
  consistency: ReadModelConsistency
  indexCheckpointId: string | null
  correlationId: string | null
}
