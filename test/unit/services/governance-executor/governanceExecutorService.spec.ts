import { expect } from 'chai'
import GovernanceExecutorService from '@services/governance-executor/governanceExecutorService'
import type { ExecutorResolution, GovernanceExecutorRef } from '@services/governance-executor/types'

describe('Service: GovernanceExecutorService', () => {
  it('lists canonical mock-first executor references', async () => {
    const response = await GovernanceExecutorService.listExecutors()
    const executors = response.data as GovernanceExecutorRef[]

    expect(executors).to.have.length.greaterThan(0)
    expect(response.metadata.defaultExecutionMode).to.equal('mock_execution')
    expect(response.metadata.productionExecutionEnabled).to.equal(false)
    expect(response.metadata.boundary).to.include('do not move funds')
  })

  it('resolves tenant executor without granting production authority', async () => {
    const response = await GovernanceExecutorService.resolveTenantExecutor('tenant-executive-dao', 'local-proposal')
    const resolution = response.data as ExecutorResolution

    expect(resolution.executor?.executorId).to.equal('mock-tenant-executive-executor')
    expect(resolution.executor?.executionMode).to.equal('mock_execution')
    expect(resolution.executor?.isProductionExecutor).to.equal(false)
    expect(resolution.executor?.address).to.equal(null)
    expect(resolution.supported).to.equal(true)
    expect(resolution.reasonCodes.map(reason => reason.reasonCode)).to.include('MOCK_EXECUTION_MODE_ACTIVE')
  })

  it('marks unsupported proposal types as not supported', async () => {
    const response = await GovernanceExecutorService.resolveTenantExecutor('tenant-executive-dao', 'unknown-defi-op')
    const resolution = response.data as ExecutorResolution

    expect(resolution.supported).to.equal(false)
    expect(resolution.reasonCodes.map(reason => reason.reasonCode)).to.include('EXECUTOR_PROPOSAL_TYPE_NOT_SUPPORTED')
  })

  it('blocks legacy observer execution surfaces', async () => {
    const response = await GovernanceExecutorService.resolveTenantExecutor(
      'tenant-community-dao',
      'legacy-voting-observation',
    )
    const resolution = response.data as ExecutorResolution

    expect(resolution.executor?.executorStatus).to.equal('blocked')
    expect(resolution.executor?.executionMode).to.equal('documentation_only')
    expect(resolution.blocked).to.equal(true)
    expect(resolution.reasonCodes.map(reason => reason.reasonCode)).to.include('EXECUTION_CHAIN_NOT_AUTHORIZED')
  })

  it('returns a blocked resolution when no executor exists', async () => {
    const response = await GovernanceExecutorService.resolveTenantExecutor('tenant-not-found')
    const resolution = response.data as ExecutorResolution

    expect(resolution.executor).to.equal(null)
    expect(resolution.blocked).to.equal(true)
    expect(resolution.reasonCodes[0].reasonCode).to.equal('GOVERNANCE_EXECUTOR_NOT_FOUND')
  })
})
