import logger from '@logger'
import { Models } from '@dbModels'
import { BlockchainLogCrawler } from '@modules/crawlers'
import { Contract, ethers, Interface } from 'ethers'
import { HarmonyVotingPlugin } from '@artifacts/HarmonyVotingPlugin'
import { ProposalHandler } from '@handlers/proposalHandler'
import { IPluginInterfaceType, type NetworksEnum } from '@types'
import ProviderModule from '@modules/provider'
import ConfigIndexerHelper from '@helpers/configIndexer'

const llo = logger.logMeta.bind(null, { service: 'jobs:HarmonyBackfill' })

interface BackfillConfig {
  pluginAddress: string
  network: NetworksEnum
  startBlock?: number
  endBlock?: number | 'latest'
  batchSize?: number
}

/**
 * Backfill job for HarmonyVoting events
 * Indexes historical ProposalCreated and VoteCast events from deployment block
 */
export class HarmonyBackfillJob {
  /**
   * Run backfill for a specific HarmonyVoting plugin
   * @param config Backfill configuration
   */
  static async backfillPlugin(config: BackfillConfig): Promise<void> {
    const { pluginAddress, network, startBlock, endBlock, batchSize = 60 } = config

    try {
      logger.info('HarmonyBackfill - Starting backfill', llo({ ...config }))

      // Find plugin in database to get deployment block
      const plugin = await Models.Plugin.findByAddress(pluginAddress, network)
      if (!plugin) {
        logger.error('HarmonyBackfill - Plugin not found', llo({ pluginAddress, network }))
        return
      }

      const fromBlock = startBlock || plugin.blockNumber
      const toBlock = endBlock || 'latest'

      logger.info(
        'HarmonyBackfill - Backfill range determined',
        llo({
          pluginAddress,
          network,
          fromBlock,
          toBlock,
        }),
      )

      // Backfill validator/processKey config (best-effort, does not depend on log ranges)
      await this.backfillValidatorConfig({ pluginAddress, network })

      // Backfill ProposalCreated events
      await this.backfillProposalCreated({
        pluginAddress,
        network,
        fromBlock,
        toBlock,
        batchSize,
      })

      // Backfill VoteCast events
      await this.backfillVoteCast({
        pluginAddress,
        network,
        fromBlock,
        toBlock,
        batchSize,
      })

      logger.info('HarmonyBackfill - Backfill completed successfully', llo({ pluginAddress, network }))
    } catch (error) {
      logger.error('HarmonyBackfill - Error during backfill', llo({ ...config, error }))
      throw error
    }
  }

  private static async backfillValidatorConfig(config: {
    pluginAddress: string
    network: NetworksEnum
  }): Promise<void> {
    const { pluginAddress, network } = config

    try {
      const plugin = await Models.Plugin.findByAddress(pluginAddress, network)
      if (!plugin) return

      // Only delegation voting plugins expose validatorAddress/processKey.
      if (plugin.interfaceType !== IPluginInterfaceType.harmonyDelegationVoting) return

      const provider = ProviderModule.getAnyRpcProvider(network)
      if (!provider) {
        logger.warn('HarmonyBackfill - Missing RPC provider for validator config', llo({ pluginAddress, network }))
        return
      }

      const contract = new Contract(
        pluginAddress,
        ['function validatorAddress() view returns (address)', 'function processKey() view returns (bytes32)'],
        provider,
      )

      let validatorAddress: string | null = null
      let processKey: string | null = null

      try {
        const v = await contract.validatorAddress()
        if (v && v !== ethers.ZeroAddress) validatorAddress = String(v)
      } catch {
        // ignore
      }

      try {
        const k = await contract.processKey()
        if (k && k !== '0x' && k !== ethers.ZeroHash) processKey = String(k)
      } catch {
        // ignore
      }

      if (!validatorAddress && !processKey) return

      await Models.ValidatorConfig.findOneAndUpdate(
        { network, pluginAddress: pluginAddress.toLowerCase() },
        {
          $set: {
            id: Models.ValidatorConfig.getEntityId({ network, pluginAddress: pluginAddress.toLowerCase() }),
            network,
            pluginAddress: pluginAddress.toLowerCase(),
            ...(validatorAddress ? { validatorAddress: validatorAddress.toLowerCase() } : {}),
            ...(processKey ? { processKey } : {}),
            lastUpdateBlock: plugin.blockNumber,
          },
        },
        { upsert: true, new: true },
      )

      if (processKey) {
        await Models.Plugin.updateOne({ network, address: pluginAddress.toLowerCase() }, { $set: { processKey } })
      }
    } catch (error) {
      logger.warn('HarmonyBackfill - Failed to backfill validator config', llo({ pluginAddress, network, error }))
    }
  }

  /**
   * Backfill ProposalCreated events
   */
  private static async backfillProposalCreated(
    config: BackfillConfig & {
      fromBlock: number
      toBlock: number | string
    },
  ): Promise<void> {
    const { pluginAddress, network, fromBlock, toBlock, batchSize } = config

    logger.info(
      'HarmonyBackfill - Starting ProposalCreated backfill',
      llo({ pluginAddress, network, fromBlock, toBlock }),
    )

    const logService = ConfigIndexerHelper.builders.plugin(
      IPluginInterfaceType.harmonyVoting,
      network,
      `${pluginAddress}-proposals`,
    )

    const crawler = new BlockchainLogCrawler({
      network,
      address: pluginAddress,
      fromBlock,
      toBlock,
      batchSize,
      skipLogProcessing: false,
      logService,
      onlyHistorical: true,
      stopOnError: false,
      onError: async (error: any) => {
        logger.error('HarmonyBackfill - Error processing ProposalCreated', llo({ pluginAddress, network, error }))
      },
      events: [
        {
          event: 'ProposalCreated',
          topic: new Interface(HarmonyVotingPlugin.abi).getEvent('ProposalCreated')?.topicHash!,
          enableHistorical: true,
          config: [
            {
              abi: [...HarmonyVotingPlugin.abi] as any,
              handler: ProposalHandler.harmonyProposalCreated,
            },
          ],
        },
      ],
    })

    const logs = await crawler.crawl()
    logger.info(
      'HarmonyBackfill - ProposalCreated backfill completed',
      llo({
        pluginAddress,
        network,
        logsProcessed: logs?.length || 0,
      }),
    )
  }

  /**
   * Backfill VoteCast events
   */
  private static async backfillVoteCast(
    config: BackfillConfig & {
      fromBlock: number
      toBlock: number | string
    },
  ): Promise<void> {
    const { pluginAddress, network, fromBlock, toBlock, batchSize } = config

    logger.info('HarmonyBackfill - Starting VoteCast backfill', llo({ pluginAddress, network, fromBlock, toBlock }))

    const logService = ConfigIndexerHelper.builders.plugin(
      IPluginInterfaceType.harmonyVoting,
      network,
      `${pluginAddress}-votes`,
    )

    const crawler = new BlockchainLogCrawler({
      network,
      address: pluginAddress,
      fromBlock,
      toBlock,
      batchSize,
      skipLogProcessing: false,
      logService,
      onlyHistorical: true,
      stopOnError: false,
      onError: async (error: any) => {
        logger.error('HarmonyBackfill - Error processing VoteCast', llo({ pluginAddress, network, error }))
      },
      events: [
        {
          event: 'HarmonyVoteCast',
          topic: new Interface(HarmonyVotingPlugin.abi).getEvent('VoteCast')?.topicHash!,
          enableHistorical: true,
          config: [
            {
              abi: [...HarmonyVotingPlugin.abi] as any,
              handler: ProposalHandler.harmonyVoteCast,
            },
          ],
        },
      ],
    })

    const logs = await crawler.crawl()
    logger.info(
      'HarmonyBackfill - VoteCast backfill completed',
      llo({
        pluginAddress,
        network,
        logsProcessed: logs?.length || 0,
      }),
    )
  }

  /**
   * Backfill all HarmonyVoting plugins for a network
   * @param network Network identifier
   */
  static async backfillAllPlugins(network: NetworksEnum): Promise<void> {
    try {
      logger.info('HarmonyBackfill - Starting backfill for all plugins', llo({ network }))

      // Find all HarmonyVoting plugins on the network
      const plugins = await Models.Plugin.find({
        network,
        interfaceType: {
          $in: [
            IPluginInterfaceType.harmonyVoting,
            IPluginInterfaceType.harmonyHipVoting,
            IPluginInterfaceType.harmonyDelegationVoting,
          ],
        },
        isSupported: true,
      })

      if (plugins.length === 0) {
        logger.info('HarmonyBackfill - No HarmonyVoting plugins found', llo({ network }))
        return
      }

      logger.info('HarmonyBackfill - Found plugins to backfill', llo({ network, count: plugins.length }))

      // Backfill each plugin sequentially to avoid RPC rate limits
      for (const plugin of plugins) {
        try {
          await this.backfillPlugin({
            pluginAddress: plugin.pluginAddress,
            network,
          })
        } catch (error) {
          logger.error(
            'HarmonyBackfill - Failed to backfill plugin',
            llo({
              pluginAddress: plugin.pluginAddress,
              network,
              error,
            }),
          )
          // Continue with next plugin even if one fails
        }
      }

      logger.info('HarmonyBackfill - Completed backfill for all plugins', llo({ network }))
    } catch (error) {
      logger.error('HarmonyBackfill - Error during backfill all', llo({ network, error }))
      throw error
    }
  }

  /**
   * Check if a plugin needs backfill (has missing proposals)
   * @param pluginAddress Plugin address
   * @param network Network identifier
   * @returns True if backfill is needed
   */
  static async needsBackfill(pluginAddress: string, network: string): Promise<boolean> {
    try {
      const plugin = await Models.Plugin.findByAddress(pluginAddress, network)
      if (!plugin) {
        return false
      }

      // Check if we have any proposals for this plugin
      const proposalCount = await Models.Proposal.countDocuments({
        pluginAddress,
        network,
      })

      // If we have 0 proposals but the plugin was deployed some time ago, it might need backfill
      // (or the DAO simply hasn't created any proposals yet)
      if (proposalCount === 0) {
        logger.info(
          'HarmonyBackfill - Plugin has no proposals, might need backfill',
          llo({
            pluginAddress,
            network,
            deployBlock: plugin.blockNumber,
          }),
        )
        return true
      }

      return false
    } catch (error) {
      logger.error('HarmonyBackfill - Error checking if backfill needed', llo({ pluginAddress, network, error }))
      return false
    }
  }
}

export default HarmonyBackfillJob
