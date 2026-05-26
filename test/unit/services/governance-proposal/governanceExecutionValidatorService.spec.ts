import { expect } from 'chai'
import GovernanceExecutionValidatorService from '@services/governance-proposal/governanceExecutionValidatorService'

describe('Service: GovernanceExecutionValidatorService', () => {
  it('allows mock executable proposals to create mock receipts only', async () => {
    const validation = await GovernanceExecutionValidatorService.validateProposalExecution(
      'proposal-mock-executable-001',
      'executed',
    )

    expect(validation.allowed).to.equal(true)
    expect(validation.blocked).to.equal(false)
    expect(validation.executionMode).to.equal('mock_execution')
    expect(validation.executionStatus).to.equal('mock_ready')
    expect(validation.requiredNextAction).to.equal('create_mock_receipt')
    expect(validation.reasonCodes.map(reason => reason.reasonCode)).to.include('MOCK_RECEIPT_ONLY')
  })

  it('blocks unsupported DeFi-sensitive proposal types', async () => {
    const validation = await GovernanceExecutionValidatorService.validateProposalExecution(
      'proposal-defi-unsupported-001',
      'queued',
    )

    expect(validation.allowed).to.equal(false)
    expect(validation.blocked).to.equal(true)
    expect(validation.requiredNextAction).to.equal('resolve_restriction')
    expect(validation.reasonCodes.map(reason => reason.reasonCode)).to.include('EXECUTOR_PROPOSAL_TYPE_NOT_SUPPORTED')
  })

  it('blocks emergency paused proposals', async () => {
    const validation = await GovernanceExecutionValidatorService.validateProposalExecution(
      'proposal-emergency-disabled-001',
      'executed',
    )

    expect(validation.allowed).to.equal(false)
    expect(validation.blocked).to.equal(true)
    expect(validation.requiredNextAction).to.equal('resolve_emergency')
    expect(validation.reasonCodes.map(reason => reason.reasonCode)).to.include('EMERGENCY_EXECUTION_DISABLED')
  })

  it('rejects invalid lifecycle transitions', async () => {
    const validation = await GovernanceExecutionValidatorService.validateProposalExecution(
      'proposal-root-constitutional-review-001',
      'executed',
    )

    expect(validation.allowed).to.equal(false)
    expect(validation.blocked).to.equal(true)
    expect(validation.reasonCodes.map(reason => reason.reasonCode)).to.include('PROPOSAL_LIFECYCLE_TRANSITION_INVALID')
  })

  it('blocks missing proposals', async () => {
    const validation = await GovernanceExecutionValidatorService.validateProposalExecution('proposal-not-found')

    expect(validation.allowed).to.equal(false)
    expect(validation.blocked).to.equal(true)
    expect(validation.requiredNextAction).to.equal('create_proposal')
    expect(validation.reasonCodes[0].reasonCode).to.equal('GOVERNANCE_PROPOSAL_NOT_FOUND')
  })
})
