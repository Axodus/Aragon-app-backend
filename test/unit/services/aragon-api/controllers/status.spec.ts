import * as sinon from 'sinon'
import { SinonSandbox } from 'sinon'
import { expect } from 'chai'
import config from '@config'
import StatusController from '@services/aragon-api/controllers/status'
import * as packageJson from '@package'

describe('Controller: Status', () => {
  let sandbox: SinonSandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
  })

  afterEach(() => {
    sandbox?.restore()
  })

  it('get status', async () => {
    const status = await StatusController.getStatus()

    expect(Object.keys(status).length).to.be.eq(8)
    expect(status.status).to.eq('healthy')
    expect(status.appName).to.eq(config.APP_NAME)
    expect(status.service).to.eq(config.SERVICES.ARAGON_API.NAME)
    expect(status.nodeVersion).to.eq(process.version)
    expect(status.environment).to.eq(config.ENVIRONMENT)
    expect(status.supportedNetworks).to.eq(config.SUPPORTED_NETWORKS)
    expect(status.appVersionPackage).to.eq(packageJson.version)
    expect(status.time).to.exist
  })

  it('returns chain registry capabilities for frontend permission guards', async () => {
    const registry = await StatusController.getChainRegistry()
    const sepolia = registry.find(chain => chain.slug === 'ethereum-sepolia')
    const harmony = registry.find(chain => chain.slug === 'harmony-mainnet')
    const tokenVoting = sepolia?.capabilities.pluginCapabilities.tokenVoting
    const harmonyVoting = harmony?.capabilities.pluginCapabilities.harmonyVoting

    expect(tokenVoting).to.exist
    expect(harmonyVoting).to.exist
    expect(sepolia?.capabilities.governanceNuclei).to.deep.equal(['constitutional', 'local'])
    expect(sepolia?.governanceStatus).to.equal('compliant')
    expect(sepolia?.federationMember).to.equal(true)
    expect(sepolia?.federationTier).to.equal('root')
    expect(sepolia?.constitutionalStanding.status).to.equal('compliant')
    expect(sepolia?.constitutionalLayer.authorityModel.constitutionalAsset).to.equal('$Neurons')
    expect(sepolia?.constitutionalLayer.federationModel.federationTier).to.equal('root')
    expect(sepolia?.constitutionalLayer.executionModel.executionAuthority).to.equal('constitutional-root')
    expect(sepolia?.constitutionalLayer.conditions.map(condition => condition.key)).to.include(
      'treasury-policy-review-required',
    )
    expect(sepolia?.capabilities.constitutionalStanding.status).to.equal('compliant')
    expect(sepolia?.capabilities.constitutionalCompatibility.reasonCodes).to.deep.equal([])
    expect(sepolia?.capabilities.constitutionalLayer.capabilities.map(capability => capability.key)).to.include(
      'transparent-reason-codes',
    )
    expect(sepolia?.capabilities.localGovernanceModels).to.include('auto-generated-platform-token')
    expect(tokenVoting?.actions.vote).to.equal(true)
    expect(tokenVoting?.executionModes).to.include('federal')
    expect(tokenVoting?.constitutionalStanding.status).to.equal('compliant')
    expect(tokenVoting?.constitutionalCompatibility.status).to.equal('compatible')
    expect(sepolia?.indexingStatus.status).to.be.oneOf(['configured', 'notConfigured', 'disabled'])
    if (sepolia?.indexingStatus.status !== 'configured') {
      expect(sepolia?.indexingStatus.reasonCode).to.equal('INDEXER_STATE_NOT_READY')
      expect(sepolia?.indexingStatus.reasonSeverity).to.equal('warning')
      expect(sepolia?.guardrailReasons).to.deep.include({
        reasonCode: 'INDEXER_STATE_NOT_READY',
        reasonSeverity: 'warning',
        source: 'indexer readiness',
        scope: 'Ethereum Sepolia',
        network: sepolia?.network,
      })
    }
    expect(harmony?.governanceStatus).to.equal('under-review')
    expect(harmony?.federationTier).to.equal('observer')
    expect(harmony?.constitutionalLayer.executionModel.executionAuthority).to.equal('legacy-voting-adapter')
    expect(harmony?.constitutionalLayer.executionModel.reasonCodes).to.include('EXECUTION_CHAIN_NOT_AUTHORIZED')
    expect(harmony?.guardrailReasons).to.deep.include({
      reasonCode: 'REMOTE_EXECUTION_GUARDRAIL_ACTIVE',
      reasonSeverity: 'constitutional',
      source: 'Constitutional Governance',
      scope: 'Harmony Mainnet',
      network: harmony?.network,
    })
    expect(harmonyVoting?.legacy).to.equal(true)
  })
})
