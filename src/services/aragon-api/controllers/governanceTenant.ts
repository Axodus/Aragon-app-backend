import { Models } from '@dbModels'
import logger from '@logger'
import mongoose from 'mongoose'

const llo = logger.logMeta.bind(null, { service: 'GovernanceTenantController' })

const tenantReason = (reasonCode: string, reasonSeverity: string, source: string, message: string) => ({
  reasonCode,
  reasonSeverity,
  source,
  message,
})

const chainIdsByNetwork: Record<string, number> = {
  'ethereum-sepolia': 11155111,
  ethereum: 1,
  base: 8453,
  arbitrum: 42161,
  polygon: 137,
  'harmony-mainnet': 1666600000,
  'harmony-testnet': 1666700000,
}

const rootTenant = {
  id: 'tenant-axodus-root',
  daoId: 'axodus-federal-governance',
  name: 'Axodus Root DAO',
  legalOrPublicName: 'Axodus Constitutional Governance',
  tenantType: 'root',
  federationTier: 'root',
  constitutionalStanding: 'compliant',
  governanceStatus: 'compliant',
  constitutionalAuthority: {
    source: '$Neurons',
    layer: 'Constitutional Governance',
    authorityModel: 'constitutional-root',
  },
  localGovernanceModel: '$Neurons constitutional token voting',
  treasury: {
    address: null,
    chainId: 11155111,
    assets: [],
    policyStatus: 'review-required',
  },
  members: {
    total: 0,
    roles: ['constitutional-authority', 'federation-registry', 'execution-review'],
  },
  productsEnabled: ['Governance', 'Treasury', 'ACS', 'Defi'],
  agentsAssigned: ['constitutional-monitor', 'treasury-review-agent'],
  activeProposals: 0,
  pendingOperations: 1,
  executionReceipts: 0,
  reasonCodes: [
    tenantReason(
      'INDEXER_STATE_NOT_READY',
      'warning',
      'indexer readiness',
      'Tenant proposal and receipt counts are currently bootstrap metadata until indexed sources are connected.',
    ),
  ],
  source: 'DaoTenantRootBootstrap',
}

const fallbackTenants = [
  rootTenant,
  {
    id: 'tenant-executive-dao',
    daoId: 'dao-executive-001',
    name: 'Axodus Executive DAO',
    legalOrPublicName: 'Axodus Executive DAO',
    tenantType: 'internal',
    federationTier: 'partner',
    constitutionalStanding: 'compliant',
    governanceStatus: 'compliant',
    constitutionalAuthority: {
      source: 'Axodus Constitution',
      layer: 'Constitutional Governance',
      authorityModel: 'federated-execution-tenant',
    },
    localGovernanceModel: '$Neurons token voting',
    treasury: {
      address: '0x2222222222222222222222222222222222222222',
      chainId: 11155111,
      assets: [],
      policyStatus: 'review-required',
    },
    members: {
      total: 3,
      roles: ['executor', 'treasury-reviewer', 'proposal-author'],
    },
    productsEnabled: ['Governance', 'Treasury', 'ACS'],
    agentsAssigned: ['proposal-review-agent', 'treasury-policy-agent'],
    activeProposals: 1,
    pendingOperations: 2,
    executionReceipts: 1,
    reasonCodes: [
      tenantReason(
        'TREASURY_POLICY_REQUIRES_REVIEW',
        'constitutional',
        'treasury policy',
        'Treasury-sensitive tenant operations require policy review before execution.',
      ),
    ],
    source: 'DaoTenantFallback',
  },
  {
    id: 'tenant-community-dao',
    daoId: 'dao-community-001',
    name: 'Axodus Community DAO',
    legalOrPublicName: 'Axodus Community DAO',
    tenantType: 'community',
    federationTier: 'observer',
    constitutionalStanding: 'under-review',
    governanceStatus: 'under-review',
    constitutionalAuthority: {
      source: 'Axodus Constitution',
      layer: 'Local Governance',
      authorityModel: 'legacy-voting-observer',
    },
    localGovernanceModel: 'Harmony legacy community signaling',
    treasury: {
      address: null,
      chainId: 1666600000,
      assets: [],
      policyStatus: 'not-configured',
    },
    members: {
      total: 0,
      roles: ['community-voter', 'observer'],
    },
    productsEnabled: ['Governance'],
    agentsAssigned: ['legacy-adapter-monitor'],
    activeProposals: 1,
    pendingOperations: 1,
    executionReceipts: 0,
    reasonCodes: [
      tenantReason(
        'EXECUTION_CHAIN_NOT_AUTHORIZED',
        'constitutional',
        'legacy adapter',
        'Harmony tenant context is voting/spoke metadata only and is not authorized as an Axodus execution chain.',
      ),
    ],
    source: 'DaoTenantFallback',
  },
]

const operationsByTenant: Record<string, any[]> = {
  'tenant-axodus-root': [
    {
      id: 'tenant-operation-root-001',
      type: 'constitutional-review',
      status: 'pending-review',
      title: 'Connect indexed governance source records',
      reasonCode: 'INDEXER_STATE_NOT_READY',
      reasonSeverity: 'warning',
    },
  ],
  'tenant-executive-dao': [
    {
      id: 'tenant-operation-exec-001',
      type: 'treasury-policy-review',
      status: 'pending-review',
      title: 'Review Sepolia treasury operating window',
      reasonCode: 'TREASURY_POLICY_REQUIRES_REVIEW',
      reasonSeverity: 'constitutional',
    },
  ],
  'tenant-community-dao': [
    {
      id: 'tenant-operation-community-001',
      type: 'legacy-voting-observation',
      status: 'observer-only',
      title: 'Observe Harmony signaling without execution authority',
      reasonCode: 'EXECUTION_CHAIN_NOT_AUTHORIZED',
      reasonSeverity: 'constitutional',
    },
  ],
}

const receiptsByTenant: Record<string, any[]> = {
  'tenant-executive-dao': [
    {
      id: 'tenant-receipt-exec-001',
      status: 'pending-indexer',
      source: 'CreateProposalRequest',
      reasonCode: 'INDEXER_STATE_NOT_READY',
      reasonSeverity: 'info',
    },
  ],
}

const tenantBoundary =
  'Tenant records are an observable governance source contract. Enforcement, sanctions and execution authority must come from indexed registries, contracts and backend guardrails.'

function resolveTenantSource(tenantRecords: any[]) {
  return tenantRecords.some(tenant => tenant.source === 'DaoRegistry') ? 'DaoRegistry' : 'DaoTenantFallback'
}

function resolveTenantType(dao: any) {
  const name = `${dao.name ?? ''} ${dao.ens ?? ''} ${dao.subdomain ?? ''}`.toLowerCase()
  if (name.includes('community')) return 'community'
  if (name.includes('product')) return 'product'
  if (name.includes('partner')) return 'partner'
  if (name.includes('client')) return 'client'
  return 'partner'
}

function resolveFederationTier(dao: any) {
  const network = String(dao.network ?? '')
  if (network === 'ethereum-sepolia') return 'partner'
  if (network.includes('harmony')) return 'observer'
  return 'partner'
}

function resolveStanding(dao: any) {
  const network = String(dao.network ?? '')
  if (network.includes('harmony')) return 'under-review'
  return 'compliant'
}

function resolveProductsEnabled(dao: any) {
  const products = new Set(['Governance'])
  const plugins = Array.isArray(dao.plugins) ? dao.plugins : []

  plugins.forEach((plugin: any) => {
    const interfaceType = String(plugin.interfaceType ?? plugin.pluginType ?? '').toLowerCase()
    if (interfaceType.includes('capital') || interfaceType.includes('treasury')) products.add('Treasury')
    if (interfaceType.includes('gauge')) products.add('Defi')
  })

  return Array.from(products)
}

function resolveLocalGovernanceModel(dao: any) {
  const plugins = Array.isArray(dao.plugins) ? dao.plugins : []
  const pluginTypes = plugins
    .map((plugin: any) => plugin.interfaceType ?? plugin.pluginType ?? plugin.subdomain)
    .filter(Boolean)

  if (pluginTypes.some((pluginType: string) => String(pluginType).toLowerCase().includes('multisig')))
    return 'multisig local governance'
  if (pluginTypes.some((pluginType: string) => String(pluginType).toLowerCase().includes('token')))
    return '$Neurons or local-token voting'
  if (String(dao.network ?? '').includes('harmony')) return 'Harmony legacy community signaling'
  return 'indexed plugin-defined governance'
}

function tenantFromIndexedDao(dao: any) {
  const standing = resolveStanding(dao)
  const tenantId = `tenant-${dao.id ?? `${dao.network}-${dao.address}`}`
  const proposalsCreated = dao.metrics?.proposalsCreated ?? 0
  const proposalsExecuted = dao.metrics?.proposalsExecuted ?? 0

  return {
    id: tenantId,
    daoId: dao.id ?? `${dao.network}-${dao.address}`,
    name: dao.name ?? dao.primaryName ?? dao.ens ?? dao.subdomain ?? 'Indexed DAO Tenant',
    legalOrPublicName: dao.primaryName ?? dao.ens ?? dao.subdomain ?? dao.name ?? undefined,
    tenantType: resolveTenantType(dao),
    federationTier: resolveFederationTier(dao),
    constitutionalStanding: standing,
    governanceStatus: standing,
    constitutionalAuthority: {
      source: 'DAO registry',
      layer: 'Local Governance',
      authorityModel: 'indexed-federated-tenant',
    },
    localGovernanceModel: resolveLocalGovernanceModel(dao),
    treasury: {
      address: dao.address ?? null,
      chainId: chainIdsByNetwork[String(dao.network ?? '')] ?? null,
      assets: [],
      policyStatus: 'not-configured',
    },
    members: {
      total: dao.members ?? dao.metrics?.members ?? 0,
      roles: ['member', 'proposal-author'],
    },
    productsEnabled: resolveProductsEnabled(dao),
    agentsAssigned: [],
    activeProposals: Math.max(proposalsCreated - proposalsExecuted, 0),
    pendingOperations: 0,
    executionReceipts: proposalsExecuted,
    reasonCodes:
      standing === 'compliant'
        ? []
        : [
            tenantReason(
              'LOCAL_GOVERNANCE_MODEL_INCOMPATIBLE',
              'constitutional',
              'DAO tenant registry',
              'Indexed DAO tenant requires constitutional review before execution authority is assumed.',
            ),
          ],
    source: 'DaoRegistry',
  }
}

async function getIndexedTenantRecords() {
  if (mongoose.connection.readyState !== 1) return []
  if (!Models.Dao || typeof Models.Dao.findWithPagination !== 'function') return []

  try {
    const result = await Models.Dao.findWithPagination({
      paginationParams: {
        page: 1,
        pageSize: 50,
        sort: 'metrics.tvlUSD',
        direction: 'desc',
      },
      extraParams: {},
      extraQueryData: {},
    })
    const daos = Array.isArray(result?.data) ? result.data : []
    return daos.map(tenantFromIndexedDao)
  } catch (error) {
    logger.warn('Failed to derive DAO tenant records from indexed DAO registry', llo({ error }))
    return []
  }
}

async function getTenantRecords() {
  const indexedTenants = await getIndexedTenantRecords()

  if (!indexedTenants.length) return fallbackTenants

  return [rootTenant, ...indexedTenants]
}

async function findTenant(tenantId: string) {
  const tenantRecords = await getTenantRecords()
  const tenant = tenantRecords.find(tenant => tenant.id === tenantId || tenant.daoId === tenantId) ?? null

  return {
    tenant,
    tenantRecords,
  }
}

const GovernanceTenantController = {
  listTenants: async () => {
    const tenantRecords = await getTenantRecords()
    const source = resolveTenantSource(tenantRecords)

    return {
      data: tenantRecords,
      metadata: {
        totalRecords: tenantRecords.length,
        source,
        boundary: tenantBoundary,
      },
    }
  },

  getTenant: async (tenantId: string) => {
    const { tenant, tenantRecords } = await findTenant(tenantId)

    if (!tenant) return null

    return {
      data: tenant,
      metadata: {
        tenantId,
        resolvedTenantId: tenant.id,
        daoId: tenant.daoId,
        source: tenant.source ?? resolveTenantSource(tenantRecords),
        boundary: tenantBoundary,
      },
    }
  },

  getTenantOperations: async (tenantId: string) => {
    const { tenant } = await findTenant(tenantId)
    const resolvedTenantId = tenant?.id ?? tenantId

    return {
      data: operationsByTenant[resolvedTenantId] ?? [],
      metadata: {
        tenantId,
        resolvedTenantId,
        source: tenant?.source ?? 'DaoTenantFallback',
        boundary: tenantBoundary,
      },
    }
  },

  getTenantReceipts: async (tenantId: string) => {
    const { tenant } = await findTenant(tenantId)
    const resolvedTenantId = tenant?.id ?? tenantId

    return {
      data: receiptsByTenant[resolvedTenantId] ?? [],
      metadata: {
        tenantId,
        resolvedTenantId,
        source: tenant?.source ?? 'DaoTenantFallback',
        boundary: tenantBoundary,
      },
    }
  },
}

export default GovernanceTenantController
