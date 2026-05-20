const constitutionalBoundary =
  'Constitutional governance records are observable source contracts. Enforcement, sanctions, treasury restrictions and execution authority must be resolved by registries, contracts, indexers and backend guardrails.'

const constitutionalReason = (reasonCode: string, reasonSeverity: string, source: string, message: string) => ({
  reasonCode,
  reasonSeverity,
  source,
  message,
})

const capabilityRecords = [
  {
    id: 'constitutional-proposal-review',
    category: 'governance',
    scope: 'constitutional',
    executionLevel: 'review',
    governanceRequirement: '$Neurons constitutional participation',
    riskLevel: 'constitutional',
    status: 'active',
    authorityLayer: 'Constitutional Governance',
    supportedPluginTypes: ['tokenVoting', 'multisig', 'plugin-defined'],
    reasonCodes: [],
  },
  {
    id: 'tenant-local-proposal-management',
    category: 'local-governance',
    scope: 'local',
    executionLevel: 'proposal-management',
    governanceRequirement: 'registered local governance model',
    riskLevel: 'medium',
    status: 'active',
    authorityLayer: 'Local Governance',
    supportedPluginTypes: ['tokenVoting', 'multisig', 'harmonyVoting', 'plugin-defined'],
    reasonCodes: [],
  },
  {
    id: 'treasury-policy-execution',
    category: 'treasury',
    scope: 'treasury',
    executionLevel: 'execution-review',
    governanceRequirement: 'treasury policy review and constitutional guardrail clearance',
    riskLevel: 'high',
    status: 'review-required',
    authorityLayer: 'Constitutional Governance',
    supportedPluginTypes: ['multisig', 'capitalDistributor', 'plugin-defined'],
    reasonCodes: [
      constitutionalReason(
        'TREASURY_POLICY_REQUIRES_REVIEW',
        'constitutional',
        'treasury policy',
        'Treasury-sensitive execution requires explicit policy review before authority is assumed.',
      ),
    ],
  },
  {
    id: 'legacy-spoke-voting-observation',
    category: 'legacy-adapter',
    scope: 'voting-spoke',
    executionLevel: 'observe-only',
    governanceRequirement: 'legacy adapter compatibility review',
    riskLevel: 'constitutional',
    status: 'restricted',
    authorityLayer: 'Constitutional Governance',
    supportedPluginTypes: ['harmonyVoting'],
    reasonCodes: [
      constitutionalReason(
        'EXECUTION_CHAIN_NOT_AUTHORIZED',
        'constitutional',
        'legacy adapter',
        'Legacy spoke voting metadata does not imply Axodus constitutional execution authority.',
      ),
    ],
  },
]

const conditionRecords = [
  {
    id: 'constitutional-standing-required',
    category: 'constitutional',
    scope: 'federation',
    validationState: 'required',
    source: 'Constitutional Governance',
    reasonCodes: [],
  },
  {
    id: 'plugin-capability-registered',
    category: 'technical',
    scope: 'plugin',
    validationState: 'required',
    source: 'plugin capability registry',
    reasonCodes: [
      constitutionalReason(
        'PLUGIN_CAPABILITY_NOT_REGISTERED',
        'warning',
        'plugin capability registry',
        'Plugin capability must be registered before production execution is authorized.',
      ),
    ],
  },
  {
    id: 'treasury-policy-review-required',
    category: 'treasury',
    scope: 'treasury',
    validationState: 'review-required',
    source: 'treasury policy',
    reasonCodes: [
      constitutionalReason(
        'TREASURY_POLICY_REQUIRES_REVIEW',
        'constitutional',
        'treasury policy',
        'Treasury-sensitive operations must pass policy review before execution.',
      ),
    ],
  },
  {
    id: 'indexer-state-ready',
    category: 'technical',
    scope: 'indexer',
    validationState: 'warning',
    source: 'indexer readiness',
    reasonCodes: [
      constitutionalReason(
        'INDEXER_STATE_NOT_READY',
        'warning',
        'indexer readiness',
        'Governance execution observability is degraded until indexer state is ready.',
      ),
    ],
  },
]

const federationModel = {
  rootAuthority: {
    id: 'axodus-root-dao',
    name: 'Axodus Root DAO',
    constitutionalAsset: '$Neurons',
    authorityModel: 'constitutional-root',
  },
  tiers: [
    { id: 'root', label: 'Root', executionAuthority: 'constitutional-root', localAutonomy: 'constitutional' },
    { id: 'partner', label: 'Partner', executionAuthority: 'bounded-federated-tenant', localAutonomy: 'bounded-by-constitution' },
    { id: 'sovereign', label: 'Sovereign', executionAuthority: 'reviewed-federated-tenant', localAutonomy: 'expanded-with-guardrails' },
    { id: 'restricted', label: 'Restricted', executionAuthority: 'guarded-or-paused', localAutonomy: 'restricted' },
    { id: 'observer', label: 'Observer', executionAuthority: 'observe-only', localAutonomy: 'signaling-only' },
  ],
  membershipRequirements: [
    'constitutional agreement',
    'governance registration',
    'capability verification',
    'treasury policy visibility',
    'operational transparency',
  ],
  localAutonomyBoundary:
    'Local DAO autonomy is valid only inside the Axodus constitutional model and does not imply sovereignty outside constitutional guardrails.',
  reasonCodes: [
    constitutionalReason(
      'LOCAL_GOVERNANCE_MODEL_INCOMPATIBLE',
      'constitutional',
      'federation registry',
      'Local governance models outside constitutional boundaries require review before federation authority is granted.',
    ),
  ],
}

function sourceMetadata(source: string, totalRecords?: number) {
  return {
    source,
    totalRecords,
    boundary: constitutionalBoundary,
  }
}

const GovernanceConstitutionalController = {
  listCapabilities: async () => ({
    data: capabilityRecords,
    metadata: sourceMetadata('ConstitutionalCapabilityBootstrap', capabilityRecords.length),
  }),

  listConditions: async () => ({
    data: conditionRecords,
    metadata: sourceMetadata('ConstitutionalConditionBootstrap', conditionRecords.length),
  }),

  getFederationModel: async () => ({
    data: federationModel,
    metadata: sourceMetadata('FederationModelBootstrap'),
  }),
}

export default GovernanceConstitutionalController
