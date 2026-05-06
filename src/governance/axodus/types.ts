import type { HexAddress } from '@types'

export type AxodusProposalStatus =
  | 'draft'
  | 'synced'
  | 'voting'
  | 'aggregation'
  | 'finalized'
  | 'executing'
  | 'executed'
  | 'failed'

export interface DaoFederationRef {
  readonly federationId: string
  readonly canonicalDao: HexAddress
  readonly executionChainId: number
  readonly memberDaos: readonly {
    readonly dao: HexAddress
    readonly chainId: number
  }[]
}

export interface VoteAggregate {
  readonly proposalId: string
  readonly chainId: number
  readonly yes: string
  readonly no: string
  readonly abstain: string
  readonly totalVotingPower: string
  readonly attestationHash?: string
}

export interface RemoteExecutionReceipt {
  readonly proposalId: string
  readonly chainId: number
  readonly target: HexAddress
  readonly messageId: string
  readonly status: 'requested' | 'delivered' | 'executed' | 'failed'
  readonly transactionHash?: string
}

export interface ConstitutionalCheckResult {
  readonly allowed: boolean
  readonly policyId?: string
  readonly reason?: string
}
