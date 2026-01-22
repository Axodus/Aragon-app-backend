import logger from '@logger'
import { Models } from '@dbModels'
import type { NetworksEnum } from '@types'
import Web3Helper from '@helpers/web3'

const llo = logger.logMeta.bind(null, { service: 'ReorgDetector' })

interface ReorgDetectionResult {
  isReorg: boolean
  reorgBlockNumber?: number
  message?: string
}

export class ReorgDetector {
  /**
   * Detects blockchain reorganization by comparing the current block hash
   * with the stored hash from the last sync.
   *
   * @param network - The network to check
   * @param blockNumber - Current block number to verify
   * @returns ReorgDetectionResult with reorg status and details
   */
  static async detectReorg(network: NetworksEnum, blockNumber: number): Promise<ReorgDetectionResult> {
    try {
      // Get current block hash from the blockchain
      const currentBlockHash = await Web3Helper.getBlockHash(blockNumber, network)
      
      if (!currentBlockHash) {
        logger.warn('Could not fetch current block hash', llo({ network, blockNumber }))
        return { isReorg: false }
      }

      // Find all ConfigIndexer records for this network
      const configs = await Models.ConfigIndexer.find({ network })

      for (const config of configs) {
        // If no stored hash, this is the first time seeing this block
        if (!config.lastBlockHash) {
          await config.update({
            lastBlockHash: currentBlockHash,
            lastBlockHashNumber: blockNumber,
          })
          continue
        }

        // If stored block number is newer, no reorg
        if ((config.lastBlockHashNumber ?? 0) > blockNumber) {
          continue
        }

        // Compare hashes for the same block number
        if (config.lastBlockHashNumber === blockNumber && config.lastBlockHash !== currentBlockHash) {
          logger.warn(
            'Blockchain reorganization detected!',
            llo({
              network,
              blockNumber,
              expectedHash: config.lastBlockHash,
              actualHash: currentBlockHash,
              service: config.service,
            }),
          )

          return {
            isReorg: true,
            reorgBlockNumber: blockNumber,
            message: `Reorg detected at block ${blockNumber} for service ${config.service}`,
          }
        }

        // If stored block number is older, update the hash
        if ((config.lastBlockHashNumber ?? 0) < blockNumber) {
          await config.update({
            lastBlockHash: currentBlockHash,
            lastBlockHashNumber: blockNumber,
          })
        }
      }

      return { isReorg: false }
    } catch (error) {
      logger.error('Error detecting reorg', llo({ network, blockNumber, error }))
      return { isReorg: false }
    }
  }

  /**
   * Rolls back data from a specific block number when a reorg is detected.
   * Deletes all events/documents created at or after the reorg block.
   *
   * @param network - The network to rollback
   * @param reorgBlockNumber - Block number from which to rollback
   */
  static async rollbackFromBlock(network: NetworksEnum, reorgBlockNumber: number): Promise<void> {
    try {
      logger.warn('Starting rollback due to reorg', llo({ network, reorgBlockNumber }))

      // Rollback Proposals
      const deletedProposals = await Models.Proposal.deleteMany({
        network,
        blockNumber: { $gte: reorgBlockNumber },
      })

      logger.info(
        'Rolled back proposals',
        llo({
          network,
          reorgBlockNumber,
          deletedCount: deletedProposals.deletedCount,
        }),
      )

      // Rollback Votes
      const deletedVotes = await Models.Vote.deleteMany({
        network,
        blockNumber: { $gte: reorgBlockNumber },
      })

      logger.info(
        'Rolled back votes',
        llo({
          network,
          reorgBlockNumber,
          deletedCount: deletedVotes.deletedCount,
        }),
      )

      // Rollback other event-based models as needed
      const rollbackModels = [
        { model: Models.Transaction, name: 'Transaction' },
        { model: Models.Permission, name: 'Permission' },
        { model: Models.Setting, name: 'Setting' },
      ]

      for (const { model, name } of rollbackModels) {
        if (model) {
          const result = await model.deleteMany({
            network,
            blockNumber: { $gte: reorgBlockNumber },
          })

          if (result.deletedCount > 0) {
            logger.info(
              `Rolled back ${name}`,
              llo({
                network,
                reorgBlockNumber,
                deletedCount: result.deletedCount,
              }),
            )
          }
        }
      }

      // Update ConfigIndexer to reset sync point
      await Models.ConfigIndexer.updateMany(
        { network },
        {
          $set: {
            lastSync: reorgBlockNumber - 1,
            lastBlockHash: undefined,
            lastBlockHashNumber: undefined,
          },
        },
      )

      logger.info('Rollback completed', llo({ network, reorgBlockNumber }))
    } catch (error) {
      logger.error('Error rolling back data', llo({ network, reorgBlockNumber, error }))
      throw error
    }
  }
}

export default ReorgDetector
