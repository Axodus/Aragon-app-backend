import Joi from 'joi'
import ValidationSchema from '@helpers/validationSchema'
import { NetworksEnum } from '@types'

const ProposalSchema = {
  getExtraParams: Joi.object({
    proposalIndex: Joi.string().optional(),
    incrementalId: Joi.number().optional(),
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .optional(),
    daoAddress: ValidationSchema.joiAddress.optional(),
    pluginAddress: ValidationSchema.joiAddress.optional(),
    creatorAddress: ValidationSchema.joiAddress.optional(),
    daoInfo: Joi.boolean().optional(),
    isExecuted: Joi.boolean().optional(),
    isSubProposal: Joi.boolean().optional(),
  }),

  getProposalById: Joi.object({
    id: Joi.string().required(),
  }),

  getProposalBySlug: Joi.object({
    slug: ValidationSchema.joiSlug.required(),
  }),

  getProposalDaoId: Joi.object({
    daoId: ValidationSchema.joiDaoId.required(),
  }),

  getProposalByTransactionHash: Joi.object({
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
    transactionHash: ValidationSchema.joiTransactionHash.required(),
  }),

  canCreateProposal: Joi.object({
    pluginAddress: ValidationSchema.joiAddress.required(),
    memberAddress: ValidationSchema.joiAddress.required(),
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .required(),
  }),

  listCreateProposalRequests: Joi.object({
    network: Joi.string()
      .valid(...Object.values(NetworksEnum))
      .optional(),
    status: Joi.string().optional(),
    daoId: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).optional().default(20),
  }).unknown(false),

  createProposalRequest: Joi.object({
    submissionMode: Joi.string().valid('mock-review', 'backend', 'onchain').required(),
    dao: Joi.object({
      id: Joi.string().allow(null).optional(),
      address: ValidationSchema.joiAddress.allow(null).optional(),
      name: Joi.string().allow(null).optional(),
      governanceStatus: Joi.string().allow(null).optional(),
      federationTier: Joi.string().allow(null).optional(),
    })
      .required()
      .unknown(false),
    chain: Joi.object({
      network: Joi.string()
        .valid(...Object.values(NetworksEnum))
        .allow(null)
        .required(),
      chainId: Joi.number().allow(null).optional(),
      name: Joi.string().allow(null).optional(),
      role: Joi.string().allow(null).optional(),
    })
      .required()
      .unknown(false),
    creator: Joi.object({
      walletAddress: ValidationSchema.joiAddress.allow(null).required(),
    })
      .required()
      .unknown(false),
    plugin: Joi.object({
      id: Joi.string().allow(null).optional(),
      address: ValidationSchema.joiAddress.allow(null).optional(),
      interfaceType: Joi.string().allow(null).optional(),
      label: Joi.string().allow(null).optional(),
    })
      .required()
      .unknown(false),
    proposal: Joi.object({
      title: Joi.string().trim().min(3).max(200).required(),
      summary: Joi.string().trim().min(3).max(5000).required(),
      actionType: Joi.string().trim().max(100).required(),
      votingStart: Joi.string().allow(null).optional(),
      votingEnd: Joi.string().allow(null).optional(),
      rationale: Joi.string().allow(null, '').max(5000).optional(),
    })
      .required()
      .unknown(false),
    guardrails: Joi.object({
      frontendBoundary: Joi.string().allow(null, '').optional(),
      reasonCodes: Joi.array()
        .items(
          Joi.object({
            reasonCode: Joi.string().required(),
            reasonSeverity: Joi.string().valid('info', 'warning', 'critical', 'constitutional').required(),
            source: Joi.string().required(),
            message: Joi.string().allow(null, '').optional(),
          }).unknown(false),
        )
        .default([]),
      requiresBackendValidation: Joi.boolean().required(),
      requiresIndexerReconciliation: Joi.boolean().required(),
      noOnchainSubmission: Joi.boolean().required(),
    })
      .required()
      .unknown(false),
  }).unknown(false),
}

export default ProposalSchema
