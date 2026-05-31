import { expect } from 'chai'
import GovernanceRuntimeValidator from '@services/governance-runtime/runtimeValidator'

describe('Service: GovernanceRuntimeValidator', () => {
  it('returns machine-readable tenant runtime restrictions', async () => {
    const response = await GovernanceRuntimeValidator.getTenantRuntime('tenant-executive-dao')

    expect(response.data?.tenant.id).to.equal('tenant-executive-dao')
    expect(response.data?.constitutionalStanding).to.equal('compliant')
    expect(response.data?.restrictions.treasuryWithdraw).to.equal('review-required')
    expect(response.metadata.source).to.equal('governance runtime')
    expect(response.metadata.boundary).to.include('machine-consumable capability checks')
  })

  it('allows local proposal creation through a runtime capability decision', async () => {
    const decision = await GovernanceRuntimeValidator.validate({
      tenantId: 'tenant-executive-dao',
      capability: 'proposal.create',
      action: 'create-proposal',
      source: 'unit-test',
    })

    expect(decision.allowed).to.equal(true)
    expect(decision.normalizedCapability).to.equal('tenant-local-proposal-management')
    expect(decision.reasonCode).to.equal('GOVERNANCE_RUNTIME_ALLOWED')
    expect(decision.reasonSeverity).to.equal('info')
    expect(decision.timestamp).to.be.a('string')
  })

  it('returns review-required for treasury-sensitive capability checks', async () => {
    const decision = await GovernanceRuntimeValidator.validate({
      tenantId: 'tenant-executive-dao',
      capability: 'treasury.withdraw',
      action: 'withdraw',
      source: 'unit-test',
    })

    expect(decision.allowed).to.equal(true)
    expect(decision.decision).to.equal('review-required')
    expect((decision as any).restriction).to.equal('review-required')
    expect(decision.reasonCode).to.equal('TREASURY_POLICY_REQUIRES_REVIEW')
    expect(decision.reasonSeverity).to.equal('constitutional')
    expect((decision as any).effectiveRestrictions.treasuryWithdraw).to.equal('review-required')
  })

  it('denies unregistered capabilities with standardized reason metadata', async () => {
    const decision = await GovernanceRuntimeValidator.validate({
      tenantId: 'tenant-executive-dao',
      capability: 'marketplace.publish',
      action: 'publish-listing',
      source: 'unit-test',
    })

    expect(decision.allowed).to.equal(false)
    expect(decision.reasonCode).to.equal('PLUGIN_CAPABILITY_NOT_REGISTERED')
    expect(decision.reasonSeverity).to.equal('critical')
    expect(decision.source).to.equal('governance runtime capability registry')
    expect(decision.timestamp).to.be.a('string')
  })

  it('denies execution capabilities for observer legacy tenants', async () => {
    const decision = await GovernanceRuntimeValidator.validate({
      tenantId: 'tenant-community-dao',
      capability: 'proposal.execute',
      action: 'execute',
      source: 'unit-test',
    })

    expect(decision.allowed).to.equal(false)
    expect(decision.reasonCode).to.equal('TENANT_CAPABILITY_DENIED')
    expect(decision.reasonSeverity).to.equal('critical')
    expect((decision as any).restriction).to.equal('denied')
    expect((decision as any).activeDirectives.map((directive: any) => directive.type)).to.include('TENANT_QUARANTINE')
  })

  it('denies runtime validation when tenant is not found', async () => {
    const decision = await GovernanceRuntimeValidator.validate({
      tenantId: 'tenant-not-found',
      capability: 'proposal.create',
    })

    expect(decision.allowed).to.equal(false)
    expect(decision.reasonCode).to.equal('DAO_TENANT_NOT_FOUND')
    expect(decision.reasonSeverity).to.equal('critical')
  })

  it('returns ACS-consumable tenant policy snapshots and restrictions', async () => {
    const policy = await GovernanceRuntimeValidator.getPolicyTenant('tenant-executive-dao')
    const restrictions = await GovernanceRuntimeValidator.getPolicyRestrictions('tenant-executive-dao')
    const snapshots = await GovernanceRuntimeValidator.listPolicySnapshots('tenant-executive-dao')

    expect(policy.data?.policySnapshot.version).to.include('runtime-')
    expect(policy.data?.effectiveRestrictions.treasuryWithdraw).to.equal('review-required')
    expect(restrictions.data?.constitutionalStanding).to.equal('compliant')
    expect(snapshots.data.length).to.be.greaterThan(0)
    expect(snapshots.metadata.source).to.equal('governance policy snapshots')
  })

  it('exposes emergency directives and runtime telemetry for ACS', async () => {
    await GovernanceRuntimeValidator.validate({
      tenantId: 'tenant-community-dao',
      capability: 'proposal.execute',
      operation: 'execute-proposal',
      requestedBy: 'acs-runtime',
    })

    const directives = await GovernanceRuntimeValidator.listEmergencyDirectives('tenant-community-dao')
    const telemetry = await GovernanceRuntimeValidator.getTelemetry()
    const decisions = await GovernanceRuntimeValidator.listDecisionEvents()

    expect(directives.data.map((directive: any) => directive.type)).to.include('TENANT_QUARANTINE')
    expect(telemetry.data.validationRequests).to.be.greaterThan(0)
    expect(telemetry.data.deniedOperations).to.be.greaterThan(0)
    expect(decisions.data[0].operationalConsequence).to.equal('OPERATION_BLOCKED')
    expect(decisions.data[0].requestedBy).to.equal('acs-runtime')
  })

  it('applies proposal effects as runtime capability mutations', async () => {
    const receipt = await GovernanceRuntimeValidator.applyProposalEffect({
      proposalId: 'proposal-runtime-trading-grant',
      tenantId: 'tenant-executive-dao',
      lifecycleState: 'executed',
      capabilitiesGranted: ['trading.execute'],
      source: 'unit-test proposal execution',
      executedBy: 'governance-runtime-test',
    })
    const decision = await GovernanceRuntimeValidator.validate({
      tenantId: 'tenant-executive-dao',
      capability: 'trading.execute',
      operation: 'trading-order',
    })
    const receipts = await GovernanceRuntimeValidator.getProposalEffectReceipts('proposal-runtime-trading-grant')

    expect(receipt.status).to.equal('applied')
    expect(receipt.affectedCapabilities).to.include('trading.execution')
    expect(decision.allowed).to.equal(true)
    expect(decision.reasonCode).to.equal('GOVERNANCE_RUNTIME_ALLOWED')
    expect(receipts.data[0].runtimeReconciliation.status).to.equal('runtime-state-updated')
  })

  it('applies proposal effects as restriction and constitutional mutations', async () => {
    const receipt = await GovernanceRuntimeValidator.applyProposalEffect({
      proposalId: 'proposal-runtime-standing-restriction',
      tenantId: 'tenant-executive-dao',
      lifecycleState: 'executed',
      restrictions: {
        trading: 'disabled',
      },
      constitutionalStanding: 'restricted',
      governanceStatus: 'restricted',
      federationTier: 'restricted',
      source: 'unit-test proposal execution',
    })
    const runtime = await GovernanceRuntimeValidator.getTenantRuntime('tenant-executive-dao')
    const history = await GovernanceRuntimeValidator.listTenantOperationalHistory('tenant-executive-dao')

    expect(receipt.mutations.map((mutation: any) => mutation.type)).to.include.members([
      'restriction-updated',
      'constitutional-state-updated',
    ])
    expect(runtime.data?.constitutionalStanding).to.equal('restricted')
    expect(runtime.data?.restrictions.trading).to.equal('disabled')
    expect(history.data[0].proposalId).to.equal('proposal-runtime-standing-restriction')
  })

  it('validates treasury operations against governance-controlled policy', async () => {
    await GovernanceRuntimeValidator.applyProposalEffect({
      proposalId: 'proposal-runtime-treasury-policy',
      tenantId: 'tenant-executive-dao',
      lifecycleState: 'executed',
      treasuryPolicy: {
        status: 'active',
        withdrawLimitUsd: 5000,
        allocationLimitUsd: 25000,
        crossChainLimitUsd: 10000,
        maxStrategyExposurePercent: 15,
        allowedStrategies: ['stablecoin-liquidity'],
        blockedStrategies: ['unverified-bridge'],
        allowedChains: [11155111],
        riskControls: {
          highRiskBlocked: true,
          requiresMultisigAboveUsd: 4000,
          requiresConstitutionalReviewAboveUsd: 6000,
        },
      },
    })

    const allowed = await GovernanceRuntimeValidator.validateTreasuryOperation({
      tenantId: 'tenant-executive-dao',
      operation: 'withdraw',
      amountUsd: 2500,
      chainId: 11155111,
      requestedBy: 'treasury-runtime-test',
    })
    const denied = await GovernanceRuntimeValidator.validateTreasuryOperation({
      tenantId: 'tenant-executive-dao',
      operation: 'withdraw',
      amountUsd: 7500,
      chainId: 11155111,
      requestedBy: 'treasury-runtime-test',
    })
    const receipts = await GovernanceRuntimeValidator.listTreasuryReceipts('tenant-executive-dao')

    expect(allowed.allowed).to.equal(true)
    expect(allowed.reasonCode).to.equal('TREASURY_RUNTIME_ALLOWED')
    expect(denied.allowed).to.equal(false)
    expect(denied.reasonCode).to.equal('TREASURY_WITHDRAW_LIMIT_EXCEEDED')
    expect(receipts.data[0].operation).to.equal('withdraw')
    expect(receipts.data[0].reasonCode).to.equal('TREASURY_WITHDRAW_LIMIT_EXCEEDED')
  })

  it('lets proposal effects freeze treasury runtime operations', async () => {
    await GovernanceRuntimeValidator.applyProposalEffect({
      proposalId: 'proposal-runtime-treasury-freeze',
      tenantId: 'tenant-executive-dao',
      lifecycleState: 'executed',
      treasuryPolicy: {
        status: 'frozen',
      },
    })

    const policy = await GovernanceRuntimeValidator.getTreasuryPolicy('tenant-executive-dao')
    const decision = await GovernanceRuntimeValidator.validateTreasuryOperation({
      tenantId: 'tenant-executive-dao',
      operation: 'allocate',
      amountUsd: 1000,
      strategy: 'stablecoin-liquidity',
      chainId: 11155111,
    })

    expect(policy.data?.treasuryPolicy.status).to.equal('frozen')
    expect(policy.data?.effectiveRestrictions.treasuryWithdraw).to.equal('disabled')
    expect(decision.allowed).to.equal(false)
    expect(decision.reasonCode).to.equal('TREASURY_OPERATION_FROZEN')
  })
})
