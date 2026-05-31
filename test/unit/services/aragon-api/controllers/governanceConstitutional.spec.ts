import { expect } from 'chai'
import GovernanceConstitutionalController from '@services/aragon-api/controllers/governanceConstitutional'

describe('Controller: GovernanceConstitutional', () => {
  it('returns constitutional capability records with reason metadata', async () => {
    const response = await GovernanceConstitutionalController.listCapabilities()
    const treasuryCapability = response.data.find(capability => capability.id === 'treasury-policy-execution')

    expect(response.metadata.source).to.equal('ConstitutionalCapabilityBootstrap')
    expect(response.metadata.boundary).to.include('observable source contracts')
    expect(treasuryCapability?.status).to.equal('review-required')
    expect(treasuryCapability?.reasonCodes[0].reasonCode).to.equal('TREASURY_POLICY_REQUIRES_REVIEW')
    expect(treasuryCapability?.reasonCodes[0].reasonSeverity).to.equal('constitutional')
  })

  it('returns constitutional condition records with transparent reason codes', async () => {
    const response = await GovernanceConstitutionalController.listConditions()
    const indexerCondition = response.data.find(condition => condition.id === 'indexer-state-ready')

    expect(response.metadata.source).to.equal('ConstitutionalConditionBootstrap')
    expect(indexerCondition?.validationState).to.equal('warning')
    expect(indexerCondition?.reasonCodes[0].reasonCode).to.equal('INDEXER_STATE_NOT_READY')
  })

  it('returns federation model boundaries without granting execution authority in frontend', async () => {
    const response = await GovernanceConstitutionalController.getFederationModel()

    expect(response.metadata.source).to.equal('FederationModelBootstrap')
    expect(response.data.rootAuthority.constitutionalAsset).to.equal('$Neurons')
    expect(response.data.tiers.map(tier => tier.id)).to.include.members(['root', 'partner', 'restricted', 'observer'])
    expect(response.data.localAutonomyBoundary).to.include('constitutional model')
    expect(response.data.reasonCodes[0].reasonCode).to.equal('LOCAL_GOVERNANCE_MODEL_INCOMPATIBLE')
  })

  it('returns the constitutional authority model with local autonomy boundaries', async () => {
    const response = await GovernanceConstitutionalController.getAuthorityModel()

    expect(response.metadata.source).to.equal('ConstitutionalAuthorityModelBootstrap')
    expect(response.data.constitutionalAuthority.source).to.equal('$Neurons')
    expect(response.data.constitutionalAuthority.responsibilities).to.include('ecosystem guardrails')
    expect(response.data.localAuthority.authorityModel).to.equal('bounded-local-autonomy')
    expect(response.data.boundaries.map(boundary => boundary.reasonCode)).to.include.members([
      'LOCAL_GOVERNANCE_MODEL_INCOMPATIBLE',
      'AGENT_PERMISSION_SCOPE_EXCEEDED',
    ])
  })

  it('returns the constitutional execution model with guarded voting-chain boundaries', async () => {
    const response = await GovernanceConstitutionalController.getExecutionModel()

    expect(response.metadata.source).to.equal('ConstitutionalExecutionModelBootstrap')
    expect(response.data.canonicalExecutionChain.network).to.equal('ethereum-sepolia')
    expect(response.data.validationFlow).to.include.members(['capability validation', 'execution receipt'])
    expect(response.data.votingChains).to.include('harmony-mainnet')
    expect(response.data.guardrails.map(guardrail => guardrail.reasonCode)).to.include.members([
      'EXECUTION_CHAIN_NOT_AUTHORIZED',
      'REMOTE_EXECUTION_GUARDRAIL_ACTIVE',
      'INDEXER_STATE_NOT_READY',
    ])
  })
})
