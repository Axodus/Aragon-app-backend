import type { AxodusChainRegistry } from '@src/chains'
import type { ConstitutionalCheckResult, DaoFederationRef, RemoteExecutionReceipt, VoteAggregate } from './types'

export interface ConstitutionalGuard {
  validateProposal(params: {
    readonly federation: DaoFederationRef
    readonly metadataHash: string
    readonly actionsHash: string
  }): Promise<ConstitutionalCheckResult>
}

export class AxodusGovernanceCore {
  constructor(
    private readonly chainRegistry: AxodusChainRegistry,
    private readonly constitutionalGuard?: ConstitutionalGuard
  ) {}

  supportedExecutionChains() {
    return this.chainRegistry.byRole('execution')
  }

  supportedVotingChains() {
    return this.chainRegistry.byRole('voting')
  }

  async validateProposal(params: {
    readonly federation: DaoFederationRef
    readonly metadataHash: string
    readonly actionsHash: string
  }): Promise<ConstitutionalCheckResult> {
    if (!this.constitutionalGuard) return { allowed: true }

    return this.constitutionalGuard.validateProposal(params)
  }

  normalizeAggregate(aggregate: VoteAggregate): VoteAggregate {
    const chain = this.chainRegistry.byChainId(aggregate.chainId)
    if (!chain?.capabilities.voting) throw new Error(`Unsupported voting chain: ${aggregate.chainId}`)

    return aggregate
  }

  normalizeExecutionReceipt(receipt: RemoteExecutionReceipt): RemoteExecutionReceipt {
    const chain = this.chainRegistry.byChainId(receipt.chainId)
    if (!chain?.capabilities.remoteExecution) {
      throw new Error(`Unsupported remote execution chain: ${receipt.chainId}`)
    }

    return receipt
  }
}
