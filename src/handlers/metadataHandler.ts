import logger from '@logger'
import { type ILogInfo, type IMetadata, IMetadataType, IPluginInterfaceType, IPluginStatus } from '@types'
import { type LogDescription } from 'ethers'
import { Models } from '@dbModels'
import IPFSModule from '@modules/ipfs'
import type LogMetadata from '@models/schema/logMetadata'
import DbOperations from '@models/utils/dbOperations'
import type Dao from '@models/schema/dao'
import type Plugin from '@models/schema/plugin'
import config from '@config'
import { PluginSettingHandler } from '@src/handlers/pluginSettingHandler'
import { PluginSlug } from '@helpers/pluginSlug'
import Utils from '@helpers/utils'
import Web3Utils from '@helpers/web3Utils'

const llo = logger.logMeta.bind(null, { service: 'handlers:MetadataHandler' })

export const MetadataHandler = {
  metadataSet: async (parsedEvent: LogDescription, info: ILogInfo) => {
    const { address, transactionHash, network, blockNumber, transactionIndex, logIndex } = info

    const daoExists = await Models.Dao.findByAddress(address, network)
    const pluginExists = await Models.Plugin.findByAddress(address, network)
    if (!daoExists && !pluginExists) return

    const existingDaoMetadata = await Models.LogMetadata.findExistingLog({
      network,
      transactionHash,
      transactionIndex,
      logIndex,
    })

    if (existingDaoMetadata) return

    try {
      const metadataUri = Web3Utils.extractMetadataUri(parsedEvent.args.metadata)
      const ipfsMetadata = await IPFSModule.fetchMetadata(metadataUri!, {
        retries: 4,
        timeout: config.IPFS.METADATA_FETCH_TIMEOUT,
      })

      if (!ipfsMetadata) {
        logger.warn('Metadata fetch failed or timed out, storing fallback record', llo({
          metadataUri,
          network,
          transactionHash,
          transactionIndex,
          logIndex,
        }))
      }

      const logMetadata: Partial<LogMetadata> = {
        network,
        transactionHash,
        transactionIndex,
        logIndex,
        metadataUri: metadataUri!,
        fetchedMetadata: !!ipfsMetadata,
        blockNumber,
        name: ipfsMetadata?.name ?? undefined,
        description: ipfsMetadata?.description ?? undefined,
        avatar: ipfsMetadata?.avatar ? (Utils.parseAvatar(ipfsMetadata.avatar) ?? undefined) : undefined,
        links: ipfsMetadata?.links ?? [],
        processKey: ipfsMetadata?.processKey ?? undefined,
        stageNames: ipfsMetadata?.stageNames ?? [],
        blockedCountries: ipfsMetadata?.blockedCountries ?? [],
        termsConditionsUrl: ipfsMetadata?.termsConditionsUrl ?? undefined,
        enableOfacCheck: ipfsMetadata?.enableOfacCheck ?? undefined,
      }

      if (daoExists) {
        await MetadataHandler._handleDaoMetadata(daoExists, logMetadata, info)
      } else if (pluginExists) {
        await MetadataHandler._handlePluginMetadata(pluginExists, logMetadata, ipfsMetadata, info)
      }
    } catch (error) {
      logger.error('Error create metadataSet', llo({ error, info }))
    }
  },

  _handleDaoMetadata: async (dao: Dao, logMetadata: Partial<LogMetadata>, info: ILogInfo) => {
    logMetadata.metadataType = IMetadataType.dao
    logMetadata.daoAddress = dao.address

    const logDb = await DbOperations.createDocument(Models.LogMetadata, logMetadata, info, 'Dao Metadata Set', llo)

    if (logDb) {
      await MetadataHandler._updateDaoMetadata(logDb)
    }
  },

  _handlePluginMetadata: async (
    plugin: Plugin,
    logMetadata: Partial<LogMetadata>,
    ipfsMetadata: IMetadata | null,
    info: ILogInfo,
  ) => {
    logMetadata.metadataType = IMetadataType.plugin
    logMetadata.pluginAddress = plugin.address

    const logDb = await DbOperations.createDocument(Models.LogMetadata, logMetadata, info, 'Plugin Metadata Set', llo)

    if (logDb) {
      await MetadataHandler._updatePluginMetadata(logDb)

      if (plugin.isSupported && plugin.status === IPluginStatus.installed) {
        await PluginSlug.updateSlug(plugin, logMetadata.processKey)
      }

      if (plugin.interfaceType === IPluginInterfaceType.spp && ipfsMetadata) {
        await PluginSettingHandler.updateStageNamesOnSppSettings(plugin, logMetadata.stageNames!, info)
      }
    }
  },

  _updatePluginMetadata: async (metadataLog: LogMetadata) => {
    const plugin = await Models.Plugin.findByAddress(metadataLog.pluginAddress, metadataLog.network)
    if (!plugin || !metadataLog.fetchedMetadata) return

    const document = {
      metadataIpfs: metadataLog.metadataUri,
      name: metadataLog.name,
      description: metadataLog.description,
      links: metadataLog.links,
      processKey: metadataLog?.processKey,
      blockedCountries: metadataLog?.blockedCountries || [],
      termsConditionsUrl: metadataLog?.termsConditionsUrl || null,
      enableOfacCheck: metadataLog?.enableOfacCheck || null,
    }

    await DbOperations.updateDocument(plugin, document, { logId: metadataLog.id }, 'Update Plugin Metadata', llo)
  },

  _updateDaoMetadata: async (metadataLog: LogMetadata) => {
    const dao = await Models.Dao.findExistingLog({
      network: metadataLog.network,
      address: metadataLog.daoAddress,
    })
    if (!dao || !metadataLog.fetchedMetadata) return

    const document = {
      metadataIpfs: metadataLog.metadataUri,
      name: metadataLog.name,
      description: metadataLog.description,
      avatar: metadataLog.avatar,
      links: metadataLog.links,
    }
    await DbOperations.updateDocument(dao, document, { logId: metadataLog.id }, 'Update Dao Metadata', llo)
  },
}
