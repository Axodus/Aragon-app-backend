import { expect } from 'chai'
import {
  buildGovernanceApiError,
  buildGovernanceApiSuccess,
  buildGovernanceProposalEndpoint,
  buildGovernanceTenantEndpoint,
  getGovernanceApiStatusForError,
  GOVERNANCE_API_BASE_PATH,
  GOVERNANCE_API_HTTP_METHODS,
  GOVERNANCE_API_STATUS_BY_ERROR_CODE,
  GOVERNANCE_FORBIDDEN_API_ENDPOINT_PATTERNS,
  GOVERNANCE_READONLY_API_ENDPOINT_METADATA,
  GOVERNANCE_READONLY_API_ENDPOINTS,
  type GovernanceApiProposalListResponse,
  type GovernanceProposalListApiQuery,
} from '@src/read-models'

describe('ReadModels:GovernanceReadOnlyApiContracts', () => {
  it('defines the read-only API base path and endpoint templates', () => {
    expect(GOVERNANCE_API_BASE_PATH).to.equal('/api/governance/v1')
    expect(GOVERNANCE_READONLY_API_ENDPOINTS.tenantSummary).to.equal('/api/governance/v1/tenants/:tenantId/summary')
    expect(GOVERNANCE_READONLY_API_ENDPOINTS.proposalList).to.equal('/api/governance/v1/tenants/:tenantId/proposals')
    expect(GOVERNANCE_READONLY_API_ENDPOINTS.proposalDetail).to.equal(
      '/api/governance/v1/tenants/:tenantId/proposals/:proposalId',
    )
  })

  it('keeps all allowed endpoint contracts GET-only', () => {
    expect([...GOVERNANCE_API_HTTP_METHODS]).to.deep.equal(['GET'])
    expect(Object.values(GOVERNANCE_READONLY_API_ENDPOINT_METADATA).map(endpoint => endpoint.method)).to.deep.equal(
      Array(Object.keys(GOVERNANCE_READONLY_API_ENDPOINT_METADATA).length).fill('GET'),
    )
  })

  it('keeps forbidden mutation and execution patterns out of allowed endpoints', () => {
    const allowedEndpointValues = Object.values(GOVERNANCE_READONLY_API_ENDPOINTS)

    for (const forbiddenPattern of GOVERNANCE_FORBIDDEN_API_ENDPOINT_PATTERNS) {
      const [, forbiddenPath] = forbiddenPattern.split(' ')
      expect(allowedEndpointValues).not.to.include(forbiddenPath)
    }

    expect(allowedEndpointValues.some(endpoint => endpoint.includes('/execute'))).to.equal(false)
    expect(allowedEndpointValues.some(endpoint => endpoint.includes('/treasury'))).to.equal(false)
    expect(allowedEndpointValues.some(endpoint => endpoint.includes('/onchain'))).to.equal(false)
  })

  it('marks audit trail and actor activity as restricted contracts', () => {
    expect(GOVERNANCE_READONLY_API_ENDPOINT_METADATA.auditTrail.accessLevel).to.equal('restricted-read')
    expect(GOVERNANCE_READONLY_API_ENDPOINT_METADATA.auditTrail.restricted).to.equal(true)
    expect(GOVERNANCE_READONLY_API_ENDPOINT_METADATA.actorActivity.accessLevel).to.equal('restricted-read')
    expect(GOVERNANCE_READONLY_API_ENDPOINT_METADATA.actorActivity.restricted).to.equal(true)
    expect(GOVERNANCE_READONLY_API_ENDPOINT_METADATA.proposalList.restricted).to.equal(false)
  })

  it('maps API error codes to transport status codes without writing responses', () => {
    expect(GOVERNANCE_API_STATUS_BY_ERROR_CODE.INVALID_QUERY).to.equal(400)
    expect(GOVERNANCE_API_STATUS_BY_ERROR_CODE.MISSING_AUTH_CONTEXT).to.equal(401)
    expect(GOVERNANCE_API_STATUS_BY_ERROR_CODE.FORBIDDEN).to.equal(403)
    expect(GOVERNANCE_API_STATUS_BY_ERROR_CODE.NOT_FOUND).to.equal(404)
    expect(GOVERNANCE_API_STATUS_BY_ERROR_CODE.METHOD_NOT_ALLOWED).to.equal(405)
    expect(GOVERNANCE_API_STATUS_BY_ERROR_CODE.SERVICE_UNAVAILABLE).to.equal(503)
    expect(getGovernanceApiStatusForError('EXECUTION_FORBIDDEN')).to.equal(403)
  })

  it('builds success and error envelopes with safe metadata', () => {
    const success = buildGovernanceApiSuccess(
      { items: [] },
      {
        requestId: 'request-1',
        correlationId: 'correlation-1',
        tenantId: 'tenant-1',
        generatedAt: '2026-05-29T00:00:00.000Z',
        freshness: 'fresh',
        warnings: [],
      },
    )

    const error = buildGovernanceApiError(
      { code: 'INVALID_QUERY', message: 'Invalid query' },
      { requestId: 'request-1', correlationId: 'correlation-1', tenantId: 'tenant-1' },
    )

    expect(success.ok).to.equal(true)
    expect(success.meta.freshness).to.equal('fresh')
    expect(error.ok).to.equal(false)
    expect(error.error.code).to.equal('INVALID_QUERY')
    expect(error).not.to.have.nested.property('error.stack')
  })

  it('builds tenant and proposal endpoints from templates', () => {
    expect(buildGovernanceTenantEndpoint(GOVERNANCE_READONLY_API_ENDPOINTS.tenantSummary, 'tenant-1')).to.equal(
      '/api/governance/v1/tenants/tenant-1/summary',
    )
    expect(
      buildGovernanceProposalEndpoint(GOVERNANCE_READONLY_API_ENDPOINTS.proposalDetail, 'tenant-1', 'proposal-1'),
    ).to.equal('/api/governance/v1/tenants/tenant-1/proposals/proposal-1')
  })

  it('fails closed for missing path parameters in endpoint builders', () => {
    expect(() => buildGovernanceTenantEndpoint(GOVERNANCE_READONLY_API_ENDPOINTS.tenantSummary, '')).to.throw(
      'Missing Governance API path parameter: tenantId',
    )
    expect(() =>
      buildGovernanceProposalEndpoint(GOVERNANCE_READONLY_API_ENDPOINTS.proposalDetail, 'tenant-1', ''),
    ).to.throw('Missing Governance API path parameter: proposalId')
  })

  it('compiles representative query and response contract fixtures', () => {
    const query: GovernanceProposalListApiQuery = {
      status: 'approved',
      decisionStatus: 'recorded',
      reviewStatus: 'complete',
      emergencyFlag: false,
      tags: ['treasury'],
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-29T00:00:00.000Z',
      limit: 25,
      offset: 0,
    }

    const response: GovernanceApiProposalListResponse = buildGovernanceApiSuccess(
      {
        metadata: {
          readModelId: 'proposal-list-tenant-1',
          tenantId: 'tenant-1',
          sourceVersion: 'mock-v1',
          generatedAt: '2026-05-29T00:00:00.000Z',
          lastSourceEventAt: null,
          freshness: 'fresh',
          consistency: 'snapshot',
          indexCheckpointId: null,
          correlationId: null,
        },
        items: [],
        page: {
          limit: 25,
          offset: 0,
          total: 0,
          hasNextPage: false,
          nextOffset: null,
        },
      },
      {
        requestId: 'request-1',
        correlationId: 'correlation-1',
        tenantId: 'tenant-1',
        generatedAt: '2026-05-29T00:00:00.000Z',
        freshness: 'fresh',
        warnings: [],
      },
    )

    expect(query.limit).to.equal(25)
    expect(response.ok).to.equal(true)
    if (response.ok) expect(response.data.items).to.deep.equal([])
  })
})
