export type GovernanceApiFreshness = 'fresh' | 'stale' | 'rebuilding' | 'unknown' | 'failed'

export interface GovernanceApiResponseMeta {
  requestId: string | null
  correlationId: string | null
  tenantId: string
  generatedAt: string
  freshness: GovernanceApiFreshness
  warnings: string[]
}

export interface GovernanceApiErrorMeta {
  requestId: string | null
  correlationId: string | null
  tenantId: string | null
}
