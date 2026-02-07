import logger from '@logger'
import { Models } from '@dbModels'
import type { HexAddress, ILogInfo } from '@types'
import { ethers, type LogDescription } from 'ethers'

const llo = logger.logMeta.bind(null, { service: 'handlers:HarmonyVotingConfigHandler' })

function normalizeAddress(address: string): HexAddress {
  return ethers.getAddress(address).toLowerCase()
}

function decodeProcessKey(processKey: unknown): string {
  const raw = String(processKey).trim()
  if (/^0x[0-9a-fA-F]{64}$/.test(raw)) {
    try {
      return ethers.decodeBytes32String(raw)
    } catch {
      return raw
    }
  }

  return raw
}

export const HarmonyVotingConfigHandler = {
  validatorAddressUpdated: async (parsedEvent: LogDescription, info: ILogInfo) => {
    try {
      const pluginAddress = normalizeAddress(info.address)
      const newAddress = normalizeAddress(parsedEvent.args.newAddress)

      await Models.ValidatorConfig.findOneAndUpdate(
        { network: info.network, pluginAddress },
        {
          $set: {
            id: Models.ValidatorConfig.getEntityId({ network: info.network, pluginAddress }),
            network: info.network,
            pluginAddress,
            validatorAddress: newAddress,
            lastUpdateTxHash: info.transactionHash,
            lastUpdateBlock: info.blockNumber,
          },
        },
        { upsert: true, new: true },
      )
    } catch (error) {
      logger.error('Harmony validatorAddressUpdated handler failed', llo({ error, info }))
    }
  },

  processKeyConfigured: async (parsedEvent: LogDescription, info: ILogInfo) => {
    try {
      const pluginAddress = normalizeAddress(info.address)
      const processKey = decodeProcessKey(parsedEvent.args.processKey)

      await Models.ValidatorConfig.findOneAndUpdate(
        { network: info.network, pluginAddress },
        {
          $set: {
            id: Models.ValidatorConfig.getEntityId({ network: info.network, pluginAddress }),
            network: info.network,
            pluginAddress,
            processKey,
            lastUpdateTxHash: info.transactionHash,
            lastUpdateBlock: info.blockNumber,
          },
        },
        { upsert: true, new: true },
      )

      // Keep Plugin.processKey in sync (best-effort).
      await Models.Plugin.updateOne({ network: info.network, address: pluginAddress }, { $set: { processKey } })
    } catch (error) {
      logger.error('Harmony processKeyConfigured handler failed', llo({ error, info }))
    }
  },
}
