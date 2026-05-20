import { expect } from 'chai'
import GovernanceTenantController from '@services/aragon-api/controllers/governanceTenant'

describe('Controller: GovernanceTenant', () => {
  it('lists tenant records with observable source metadata', async () => {
    const response = await GovernanceTenantController.listTenants()

    expect(response.data.length).to.be.greaterThan(0)
    expect(response.metadata.source).to.be.oneOf(['DaoRegistry', 'DaoTenantFallback'])
    expect(response.metadata.boundary).to.include('observable governance source contract')
  })

  it('returns a tenant detail source contract by tenant id', async () => {
    const response = await GovernanceTenantController.getTenant('tenant-executive-dao')

    expect(response?.data.id).to.equal('tenant-executive-dao')
    expect(response?.data.daoId).to.equal('dao-executive-001')
    expect(response?.data.reasonCodes[0].reasonCode).to.equal('TREASURY_POLICY_REQUIRES_REVIEW')
    expect(response?.metadata.tenantId).to.equal('tenant-executive-dao')
    expect(response?.metadata.resolvedTenantId).to.equal('tenant-executive-dao')
    expect(response?.metadata.source).to.equal('DaoTenantFallback')
    expect(response?.metadata.boundary).to.include('backend guardrails')
  })

  it('resolves operations and receipts through the same tenant source metadata', async () => {
    const operations = await GovernanceTenantController.getTenantOperations('dao-executive-001')
    const receipts = await GovernanceTenantController.getTenantReceipts('dao-executive-001')

    expect(operations.data[0].reasonCode).to.equal('TREASURY_POLICY_REQUIRES_REVIEW')
    expect(operations.metadata.resolvedTenantId).to.equal('tenant-executive-dao')
    expect(operations.metadata.source).to.equal('DaoTenantFallback')
    expect(receipts.data[0].source).to.equal('CreateProposalRequest')
    expect(receipts.metadata.resolvedTenantId).to.equal('tenant-executive-dao')
  })

  it('returns null for an unknown tenant detail request', async () => {
    const response = await GovernanceTenantController.getTenant('tenant-not-found')

    expect(response).to.equal(null)
  })
})
