import logger from '@logger'
import Web3Helper from '@helpers/web3'
import { Models } from '@dbModels'
import { NetworksEnum } from '@types'

const llo = logger.logMeta.bind(null, { service: 'helpers:ReorgDetection' })

interface ReorgCheckResult {
  isReorg: boolean
  affectedBlock?: number
  expectedHash?: string
  actualHash?: string
}

/**
 * Helper for detecting and handling blockchain reorganizations
 */
export class ReorgDetectionHelper {
  private static normalizeNetwork(network: NetworksEnum | string): NetworksEnum | null {
    if (Object.values(NetworksEnum).includes(network as NetworksEnum)) {
      return network as NetworksEnum
    }

    const normalized = network.toLowerCase()
    const legacyMap: Record<string, NetworksEnum> = {
      harmony: NetworksEnum.harmonyMainnet,
      'harmony-mainnet': NetworksEnum.harmonyMainnet,
      'harmony-testnet': NetworksEnum.harmonyTestnet,
      ethereum: NetworksEnum.ethereumMainnet,
      'ethereum-mainnet': NetworksEnum.ethereumMainnet,
      sepolia: NetworksEnum.ethereumSepolia,
      'ethereum-sepolia': NetworksEnum.ethereumSepolia,
      polygon: NetworksEnum.polygonMainnet,
      'polygon-mainnet': NetworksEnum.polygonMainnet,
    }

    return legacyMap[normalized] ?? null
  }

  /**
   * Check if a reorg occurred by comparing stored block hash with current chain state
   * @param blockNumber Block number to check
   * @param storedBlockHash Previously stored block hash
   * @param network Network identifier
   * @returns ReorgCheckResult indicating if reorg detected
   */
  static async checkReorg(
    blockNumber: number,
    storedBlockHash: string,
    network: NetworksEnum | string,
  ): Promise<ReorgCheckResult> {
    try {
      const normalizedNetwork = this.normalizeNetwork(network)
      if (!normalizedNetwork) {
        logger.warn('ReorgCheck - Unsupported network', llo({ blockNumber, network }))
        return { isReorg: false }
      }

      const currentBlock = await Web3Helper.getBlock(blockNumber, normalizedNetwork)

      if (!currentBlock) {
        logger.warn('ReorgCheck - Block not found on current chain', llo({ blockNumber, network }))
        return { isReorg: false }
      }

      const currentHash = currentBlock.hash

      if (!currentHash) {
        logger.warn('ReorgCheck - Block hash not available on current chain', llo({ blockNumber, network }))
        return { isReorg: false }
      }

      if (currentHash !== storedBlockHash) {
        logger.warn(
          'ReorgDetected - Block hash mismatch',
          llo({
            blockNumber,
            network,
            storedHash: storedBlockHash,
            currentHash: currentHash ?? undefined,
          }),
        )
        return {
          isReorg: true,
          affectedBlock: blockNumber,
          expectedHash: storedBlockHash,
          actualHash: currentHash ?? undefined,
        }
      }

      return { isReorg: false }
    } catch (error) {
      logger.error('ReorgCheck - Error checking for reorg', llo({ blockNumber, network, error }))
      return { isReorg: false }
    }
  }

  /**
   * Get confirmation threshold (number of blocks to wait before considering a block finalized)
   * @param network Network identifier
   * @returns Number of confirmation blocks
   */
  static getConfirmationThreshold(network: string): number {
    // Harmony finality: ~2 epochs = ~7200 blocks (assuming 2s block time, 2 epochs = ~4 hours)
    // For faster UX, we use ~100 blocks (~3.3 minutes) as confirmation threshold
    const confirmationMap: Record<string, number> = {
      // Current NetworksEnum values
      'harmony-mainnet': 100,
      'harmony-testnet': 50,
      'ethereum-mainnet': 12,
      'ethereum-sepolia': 12,
      'polygon-mainnet': 128,

      // Legacy aliases kept for backward compatibility
      harmony: 100,
      ethereum: 12,
      polygon: 128,
      goerli: 12,
      sepolia: 12,
    }

    return confirmationMap[network.toLowerCase()] || 12
  }

  /**
   * Check if a block is considered finalized based on confirmation threshold
   * @param blockNumber Block number to check
   * @param currentBlock Latest block number
   * @param network Network identifier
   * @returns True if block is finalized
   */
  static isBlockFinalized(blockNumber: number, currentBlock: number, network: string): boolean {
    const threshold = this.getConfirmationThreshold(network)
    return currentBlock - blockNumber >= threshold
  }

  /**
   * Rollback proposals affected by a reorg
   * @param fromBlock Starting block of reorg
   * @param toBlock Ending block of reorg
   * @param network Network identifier
   */
  static async rollbackProposals(fromBlock: number, toBlock: number, network: string): Promise<void> {
    try {
      logger.warn('ReorgRollback - Rolling back proposals', llo({ fromBlock, toBlock, network }))

      // Find all proposals in the affected block range
      const affectedProposals = await Models.Proposal.find({
        network,
        blockNumber: { $gte: fromBlock, $lte: toBlock },
      })

      if (affectedProposals.length === 0) {
        logger.info('ReorgRollback - No proposals affected', llo({ fromBlock, toBlock, network }))
        return
      }

      // Delete affected proposals (they will be re-indexed if they exist on the canonical chain)
      await Models.Proposal.deleteMany({
        network,
        blockNumber: { $gte: fromBlock, $lte: toBlock },
      })

      logger.info(
        'ReorgRollback - Proposals rolled back',
        llo({
          fromBlock,
          toBlock,
          network,
          count: affectedProposals.length,
        }),
      )
    } catch (error) {
      logger.error('ReorgRollback - Error rolling back proposals', llo({ fromBlock, toBlock, network, error }))
      throw error
    }
  }

  /**
   * Rollback votes affected by a reorg
   * @param fromBlock Starting block of reorg
   * @param toBlock Ending block of reorg
   * @param network Network identifier
   */
  static async rollbackVotes(fromBlock: number, toBlock: number, network: string): Promise<void> {
    try {
      logger.warn('ReorgRollback - Rolling back votes', llo({ fromBlock, toBlock, network }))

      const affectedVotes = await Models.Vote.find({
        network,
        blockNumber: { $gte: fromBlock, $lte: toBlock },
      })

      if (affectedVotes.length === 0) {
        logger.info('ReorgRollback - No votes affected', llo({ fromBlock, toBlock, network }))
        return
      }

      await Models.Vote.deleteMany({
        network,
        blockNumber: { $gte: fromBlock, $lte: toBlock },
      })

      logger.info(
        'ReorgRollback - Votes rolled back',
        llo({
          fromBlock,
          toBlock,
          network,
          count: affectedVotes.length,
        }),
      )
    } catch (error) {
      logger.error('ReorgRollback - Error rolling back votes', llo({ fromBlock, toBlock, network, error }))
      throw error
    }
  }
}

export default ReorgDetectionHelper
