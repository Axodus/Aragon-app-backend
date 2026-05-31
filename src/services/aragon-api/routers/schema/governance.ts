import Joi from 'joi'

const GovernanceSchema = {
  runtimeValidate: Joi.object({
    tenantId: Joi.string().required(),
    capability: Joi.string().required(),
    operation: Joi.string().optional(),
    action: Joi.string().optional(),
    source: Joi.string().optional(),
    resource: Joi.string().optional(),
    requestedBy: Joi.string().optional(),
    metadata: Joi.object().unknown(true).optional(),
  }).unknown(false),

  proposalEffect: Joi.object({
    proposalId: Joi.string().required(),
    tenantId: Joi.string().required(),
    lifecycleState: Joi.string().valid('approved', 'rejected', 'executed').required(),
    source: Joi.string().optional(),
    executedBy: Joi.string().optional(),
    capabilitiesGranted: Joi.array().items(Joi.string()).optional().default([]),
    capabilitiesRevoked: Joi.array().items(Joi.string()).optional().default([]),
    restrictions: Joi.object()
      .pattern(Joi.string(), Joi.string().valid('allowed', 'limited', 'denied', 'disabled', 'review-required'))
      .optional(),
    treasuryPolicy: Joi.object().unknown(true).optional(),
    constitutionalStanding: Joi.string()
      .valid('compliant', 'restricted', 'sanctioned', 'suspended', 'under-review')
      .optional(),
    governanceStatus: Joi.string()
      .valid('compliant', 'restricted', 'sanctioned', 'suspended', 'under-review')
      .optional(),
    federationTier: Joi.string().optional(),
    metadata: Joi.object().unknown(true).optional(),
  }).unknown(false),

  treasuryOperation: Joi.object({
    tenantId: Joi.string().required(),
    operation: Joi.string().valid('withdraw', 'allocate', 'cross-chain-transfer', 'strategy-exposure').required(),
    amountUsd: Joi.number().min(0).optional(),
    strategy: Joi.string().optional(),
    chainId: Joi.number().integer().optional(),
    destinationChainId: Joi.number().integer().optional(),
    riskLevel: Joi.string().valid('low', 'moderate', 'high', 'critical').optional(),
    requestedBy: Joi.string().optional(),
    source: Joi.string().optional(),
    metadata: Joi.object().unknown(true).optional(),
  }).unknown(false),
}

export default GovernanceSchema
