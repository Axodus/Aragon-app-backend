import { ModelProxy, Models } from '@dbModels'
import {
  ErrorKeyEnum,
  type IProposalsResponse,
  type IPaginatedResult,
  type IPaginationParams,
  type IProposalExtraParams,
  type IPairParams,
  EnumQueueName,
  type ICanCreateProposalParams,
  IPluginStatus,
} from '@types'
import { assertExposable } from '@errors'
import PairDataModule from '@modules/pairData'
import RabbitMQHelper from '@helpers/rabbitMQ'
import config from '@config'
import logger from '@logger'
import utils from '@helpers/utils'
import { PluginSlug as PluginSlugHelper } from '@helpers/pluginSlug'
import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

const llo = logger.logMeta.bind(null, { service: 'ProposalController' })

const createProposalReceipts = new Map<string, any>()

const createProposalReason = (reasonCode: string, reasonSeverity: string, source: string, message: string) => ({
  reasonCode,
  reasonSeverity,
  source,
  message,
})

const createProposalStorage = (
  mode: 'mongo' | 'memory-fallback',
  source: 'CreateProposalRequest' | 'memory-fallback',
  reasonCode?: string,
) => ({
  mode,
  source,
  persisted: mode === 'mongo',
  reasonCode,
  reasonSeverity: reasonCode ? 'warning' : 'info',
  message:
    mode === 'mongo'
      ? 'Create proposal review receipt is persisted in Mongo for backend observability.'
      : 'Create proposal review receipt is stored in memory for this API process only.',
})

const withCreateProposalStorage = (
  receipt: any,
  mode: 'mongo' | 'memory-fallback',
  source: 'CreateProposalRequest' | 'memory-fallback',
  reasonCode?: string,
) => ({
  ...receipt,
  storageMode: mode,
  source,
  storage: createProposalStorage(mode, source, reasonCode),
  indexerReconciliation: {
    ...receipt.indexerReconciliation,
    source,
    storageMode: mode,
    observedRequestId: receipt.id,
  },
})

const createProposalReceiptMatches = (
  receipt: any,
  filters: {
    network?: string
    status?: string
    daoId?: string
    daoAddress?: string
    chainId?: number
  },
) => {
  if (filters.network && receipt?.observedState?.chain?.network !== filters.network) return false
  if (filters.status && receipt?.status !== filters.status) return false
  if (filters.daoId && receipt?.observedState?.dao?.id !== filters.daoId) return false
  if (filters.daoAddress && receipt?.observedState?.dao?.address !== filters.daoAddress) return false
  if (filters.chainId && receipt?.observedState?.chain?.chainId !== filters.chainId) return false
  return true
}

const getCreateProposalRequestModel = async () => {
  if (Models.CreateProposalRequest) {
    return Models.CreateProposalRequest
  }

  if (mongoose.connection.readyState !== 1) {
    return null
  }

  try {
    await ModelProxy.setMongoModels()
  } catch (error) {
    logger.warn('Failed to initialize createProposal request model', llo({ error }))
  }

  return Models.CreateProposalRequest ?? null
}

const ProposalController = {
  getProposalBySlug: async (fullSlug: string, pairParams: IPairParams = {}): Promise<IProposalsResponse> => {
    const extraParams: any = await PairDataModule.pairFromExtraParams({}, pairParams)
    assertExposable(extraParams?.daoAddress, ErrorKeyEnum.daoNotFound)

    const { slug, index } = utils.splitSlug(fullSlug)

    const normalizeKey = (value?: string | null): string | null => {
      if (!value || typeof value !== 'string') return null
      const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '')
      return normalized.length > 0 ? normalized : null
    }

    const resolvePluginBySlugFallback = async (): Promise<any | null> => {
      if (!slug || !extraParams?.daoAddress || !extraParams?.network) return null

      const installedPlugins = await Models.Plugin.find({
        daoAddress: extraParams.daoAddress,
        network: extraParams.network,
        status: IPluginStatus.installed,
      }).exec()

      const requested = normalizeKey(slug)
      if (!requested) return null

      for (const p of installedPlugins) {
        const candidates = new Set<string>()

        const processKeyCandidate = normalizeKey(p.processKey)
        if (processKeyCandidate) candidates.add(processKeyCandidate)

        const defaultSlugCandidate = normalizeKey(PluginSlugHelper._defaultSlug(p))
        if (defaultSlugCandidate) candidates.add(defaultSlugCandidate)

        if (candidates.has(requested)) {
          return p
        }
      }

      return null
    }

    let plugin: any | null = null

    if (slug) {
      const pluginId = await Models.Plugin.getPluginIdBySlugAndDao(slug, extraParams.daoAddress, extraParams.network)
      if (pluginId) {
        plugin = await Models.Plugin.findByEntityId(pluginId)
      }
    }

    if (!plugin) {
      plugin = await resolvePluginBySlugFallback()
    }

    assertExposable(plugin, ErrorKeyEnum.pluginNotFound)

    const proposal = await Models.Proposal.findByProposalIncrementalId(index, plugin.address, plugin.network)
    assertExposable(proposal, ErrorKeyEnum.proposalNotFound)

    let proposalId = proposal.id

    // Backward-compat: some historical backfills inserted Proposal docs without the deterministic `id` field.
    // The slug endpoint expects `id` to be present to retrieve the enriched projection.
    if (!proposalId) {
      const transactionHash = proposal.transactionHash
      const proposalIndex = proposal.proposalIndex
      const proposalPluginAddress = proposal.pluginAddress

      if (transactionHash && proposalIndex && proposalPluginAddress) {
        proposalId = Models.Proposal.getEntityId({
          transactionHash,
          pluginAddress: proposalPluginAddress,
          proposalIndex,
        })

        try {
          await Models.Proposal.updateOne(
            { _id: proposal._id, id: { $in: [null, undefined] } },
            { $set: { id: proposalId } },
          )
        } catch (error) {
          // Non-fatal: still attempt to read using the computed id.
          logger.warn('Failed to backfill proposal id', llo({ error, proposalId }))
        }
      }
    }

    assertExposable(proposalId, ErrorKeyEnum.proposalNotFound)

    return ProposalController.getProposalById(proposalId)
  },

  getProposalById: async (id: string): Promise<IProposalsResponse> => {
    const proposal = await Models.Proposal.findWithEntityId(id)
    assertExposable(proposal, ErrorKeyEnum.notFound)
    return proposal
  },

  getProposalsWithPagination: async (
    paginationParams: IPaginationParams = {},
    extraParams: IProposalExtraParams = {},
    pairParams: IPairParams = {},
  ): Promise<IPaginatedResult<IProposalsResponse>> => {
    paginationParams = await PairDataModule.pairFromPaginationParams(paginationParams)
    extraParams = await PairDataModule.pairFromExtraParams(extraParams, pairParams)
    return await Models.Proposal.findWithPagination({ extraParams, paginationParams })
  },

  canCreateProposal: async (params: ICanCreateProposalParams) => {
    try {
      return await RabbitMQHelper.sendMessage(
        EnumQueueName.canCreateProposal,
        {
          id: `canCreateProposal-${params.pluginAddress}-${params.memberAddress}-${params.network}`,
          params: {
            pluginAddress: params.pluginAddress,
            memberAddress: params.memberAddress,
            network: params.network,
          },
        },
        { waitResponse: true, timeout: config.RABBITMQ.TIMEOUT },
      )
    } catch (error) {
      logger.warn('Error while checking if user can create proposal', llo({ error, ...params }))
      return false
    }
  },

  createProposalRequest: async (request: any) => {
    const submittedAt = new Date().toISOString()
    const receiptId = `backend-create-${uuidv4()}`
    const reasonCodes = [
      ...(request.guardrails?.reasonCodes ?? []),
      createProposalReason(
        'CREATE_PROPOSAL_BACKEND_REVIEW_REQUIRED',
        'info',
        'backend submission boundary',
        'Create proposal request was accepted for backend review without wallet prompt or on-chain transaction.',
      ),
      createProposalReason(
        'INDEXER_STATE_NOT_READY',
        'info',
        'indexer readiness',
        'Proposal creation is waiting for indexer reconciliation after a future on-chain submission adapter is connected.',
      ),
    ]

    const receipt = {
      id: receiptId,
      proposalDraftId: request.proposal?.draftId ?? null,
      status: 'backend-review-queued',
      submissionMode: 'backend',
      submittedAt,
      message:
        'Create proposal request accepted by the Governance API for non-on-chain review. No wallet prompt or transaction was submitted.',
      reasonCodes,
      indexerReconciliation: {
        status: 'pending',
        reasonCode: 'INDEXER_STATE_NOT_READY',
        reasonSeverity: 'info',
        reconciliationMode: 'review-request-only',
        source: 'backend-review',
        observedRequestId: receiptId,
        message: 'Proposal submission is waiting for indexer reconciliation.',
      },
      observedState: {
        dao: request.dao,
        chain: request.chain,
        plugin: request.plugin,
        proposal: request.proposal,
        governanceBoundary:
          'Backend records observable create-proposal request state only. Constitutional validity, permissions, sanctions and execution remain sourced from registries, contracts, guardrails and indexers.',
      },
      request,
    }

    const createProposalRequestModel = await getCreateProposalRequestModel()

    if (createProposalRequestModel?.create) {
      try {
        const persistedReceipt = withCreateProposalStorage(receipt, 'mongo', 'CreateProposalRequest')
        await createProposalRequestModel.create({
          id: receiptId,
          network: request.chain.network,
          chainId: request.chain?.chainId ?? null,
          status: receipt.status,
          submissionMode: receipt.submissionMode,
          daoId: request.dao?.id ?? null,
          daoAddress: request.dao?.address ?? null,
          pluginId: request.plugin?.id ?? null,
          pluginAddress: request.plugin?.address ?? null,
          creatorAddress: request.creator?.walletAddress ?? null,
          title: request.proposal.title,
          actionType: request.proposal.actionType,
          request,
          receipt: persistedReceipt,
        })
        return persistedReceipt
      } catch (error) {
        logger.warn('Failed to persist createProposal request; using in-memory fallback', llo({ error, receiptId }))
        const fallbackReceipt = withCreateProposalStorage(
          receipt,
          'memory-fallback',
          'memory-fallback',
          'CREATE_PROPOSAL_PERSISTENCE_FALLBACK',
        )
        createProposalReceipts.set(receiptId, fallbackReceipt)
        return fallbackReceipt
      }
    } else {
      const fallbackReceipt = withCreateProposalStorage(
        receipt,
        'memory-fallback',
        'memory-fallback',
        'CREATE_PROPOSAL_PERSISTENCE_FALLBACK',
      )
      createProposalReceipts.set(receiptId, fallbackReceipt)
      return fallbackReceipt
    }
  },

  getCreateProposalRequest: async (id: string) => {
    const createProposalRequestModel = await getCreateProposalRequestModel()

    if (createProposalRequestModel?.findByEntityId) {
      try {
        const storedRequest = await createProposalRequestModel.findByEntityId(id)
        if (storedRequest?.receipt) {
          return withCreateProposalStorage(storedRequest.receipt, 'mongo', 'CreateProposalRequest')
        }
      } catch (error) {
        logger.warn('Failed to read persisted createProposal request; using in-memory fallback', llo({ error, id }))
      }
    }

    return createProposalReceipts.get(id) ?? null
  },

  listCreateProposalRequests: async (filters: {
    network?: string
    status?: string
    daoId?: string
    daoAddress?: string
    chainId?: number
    limit?: number
  }) => {
    const createProposalRequestModel = await getCreateProposalRequestModel()

    if (createProposalRequestModel?.listRecent) {
      try {
        const storedRequests = await createProposalRequestModel.listRecent(filters)
        return {
          items: storedRequests
            .map((request: any) =>
              request.receipt ? withCreateProposalStorage(request.receipt, 'mongo', 'CreateProposalRequest') : null,
            )
            .filter(Boolean),
          count: storedRequests.length,
          source: 'CreateProposalRequest',
          storageMode: 'mongo',
        }
      } catch (error) {
        logger.warn(
          'Failed to list persisted createProposal requests; using in-memory fallback',
          llo({ error, filters }),
        )
      }
    }

    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100)
    const items = Array.from(createProposalReceipts.values())
      .filter(receipt => createProposalReceiptMatches(receipt, filters))
      .slice(-limit)
      .reverse()

    return {
      items,
      count: items.length,
      source: 'memory-fallback',
      storageMode: 'memory-fallback',
    }
  },

  getProposalDecodedActions: async (id: string): Promise<any> => {
    const proposal = await Models.Proposal.findByEntityId(id)
    assertExposable(proposal, ErrorKeyEnum.notFound)

    if (!proposal.rawActions || proposal.rawActions.length === 0) {
      return { actions: [], decoding: proposal.decoding }
    }

    return {
      decoding: proposal.decoding,
      actions: proposal.actions || [],
      rawActions: proposal.rawActions || [],
    }
  },
}

export default ProposalController
