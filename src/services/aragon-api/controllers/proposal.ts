import { Models } from '@dbModels'
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

const llo = logger.logMeta.bind(null, { service: 'ProposalController' })

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

        const processKeyCandidate = normalizeKey((p as any).processKey)
        if (processKeyCandidate) candidates.add(processKeyCandidate)

        const defaultSlugCandidate = normalizeKey(PluginSlugHelper._defaultSlug(p as any) as any)
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
            { _id: (proposal as any)._id, id: { $in: [null, undefined] } },
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
