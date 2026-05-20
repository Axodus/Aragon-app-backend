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
})
