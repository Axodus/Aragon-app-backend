import {
  EnumQueueName,
  type ILogPluginSetupProcessorParams,
  type IGetPluginsByDaoParams,
  type IPluginExtraParams,
  IPluginInterfaceType,
  NetworksEnum,
} from '@types'
import RabbitMQHelper from '@helpers/rabbitMQ'
import Utils from '@helpers/utils'
import config from '@config'
import logger from '@logger'
import { Models } from '@dbModels'
import { PluginAuthorizationModel } from '@src/dbModels/pluginAuthorization'
import { HarmonyRpcService } from '@services/harmonyRpcService'
import ProviderModule from '@modules/provider'
import { Contract, JsonRpcProvider, ethers, formatUnits } from 'ethers'
import { toHarmonyBech32Address } from '@src/utils/harmonyAddressUtils'
import { toHarmonyHexAddress } from '@src/utils/harmonyAddressUtils'

const llo = logger.logMeta.bind(null, { service: 'PluginsController' })

const harmonyNetworks = new Set<NetworksEnum>([NetworksEnum.harmonyMainnet, NetworksEnum.harmonyTestnet])
const allowlistReadAbi = ['function isDAOAllowed(address) view returns (bool)']

const harmonyAllowlistBySlug = new Map<string, string | null>([
  ['harmony-hip', config.HARMONY_ALLOWLIST?.HIP_PLUGIN_ADDRESS ?? null],
  ['harmony-delegation', config.HARMONY_ALLOWLIST?.DELEGATION_PLUGIN_ADDRESS ?? null],
])

function getAllowlistAddress(pluginSlug: string): string | null {
  return harmonyAllowlistBySlug.get(pluginSlug) ?? null
}

function getRpcProvider(network: NetworksEnum): JsonRpcProvider | null {
  const existing = ProviderModule.getAnyRpcProvider(network) as JsonRpcProvider | null
  if (existing) return existing

  const networkKey = Utils.networkToAragon(network as any)
  const rpcUrl = (networkKey && config.NODES?.[networkKey]?.ARAGON_RPC) || null
  if (!rpcUrl) return null

  return new JsonRpcProvider(rpcUrl)
}

function decodeProcessKey(processKey: string | null | undefined): string | null {
  if (processKey == null) return null
  const raw = String(processKey).trim()
  if (raw.length === 0) return null

  if (/^0x[0-9a-fA-F]{64}$/.test(raw)) {
    try {
      return ethers.decodeBytes32String(raw)
    } catch {
      return raw
    }
  }

  return raw
}

function formatCommissionRate(rate: unknown): string {
  const numeric = typeof rate === 'string' ? Number(rate) : typeof rate === 'number' ? rate : NaN
  if (!Number.isFinite(numeric)) return '0.00%'
  return `${(numeric * 100).toFixed(2)}%`
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1
  const safePageSize = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 10
  const start = (safePage - 1) * safePageSize
  return items.slice(start, start + safePageSize)
}

async function backfillHarmonyDelegationProcessKeys(params: {
  plugins: any[]
  network: NetworksEnum
}): Promise<void> {
  const { plugins, network } = params

  const targets = plugins.filter(
    plugin =>
      plugin?.interfaceType === IPluginInterfaceType.harmonyDelegationVoting &&
      !decodeProcessKey(plugin?.processKey) &&
      typeof plugin?.address === 'string' &&
      plugin.address.length > 0,
  )

  if (targets.length === 0) return

  const pluginAddresses = [...new Set(targets.map(p => String(p.address).toLowerCase()))]
  const networkVariants = [network, String(network).toLowerCase()]

  // 1) Prefer DB-backed config (populated by indexer events or other routes).
  try {
    const configs = await Models.ValidatorConfig.find({
      network: { $in: networkVariants },
      pluginAddress: { $in: pluginAddresses },
    })
      .select('pluginAddress processKey')
      .lean()
      .exec()

    const cfgMap = new Map<string, string>()
    for (const cfg of configs ?? []) {
      const decoded = decodeProcessKey(cfg?.processKey)
      if (decoded) cfgMap.set(String(cfg.pluginAddress).toLowerCase(), decoded)
    }

    for (const plugin of targets) {
      const addr = String(plugin.address).toLowerCase()
      const fromCfg = cfgMap.get(addr)
      if (fromCfg) {
        plugin.processKey = fromCfg
      }
    }
  } catch (error) {
    logger.debug('ValidatorConfig processKey backfill skipped', llo({ network, error }))
  }

  const stillMissing = targets.filter(p => !decodeProcessKey(p?.processKey))
  if (stillMissing.length === 0) return

  // 2) Best-effort on-chain read to prevent UI from falling back to slug.
  try {
    const networkKey = Utils.networkToAragon(network as any)
    const rpcUrl = (networkKey && config.NODES?.[networkKey]?.ARAGON_RPC) || null
    if (!rpcUrl) return

    const provider = new JsonRpcProvider(rpcUrl)
    const readAbi = ['function processKey() view returns (bytes32)']

    const results = await Promise.all(
      stillMissing.map(async plugin => {
        const address = String(plugin.address).toLowerCase()
        try {
          const contract = new Contract(address, readAbi, provider)
          const raw = await contract.processKey()
          const decoded = decodeProcessKey(raw)
          return { address, processKey: decoded }
        } catch {
          return { address, processKey: null }
        }
      }),
    )

    for (const { address, processKey } of results) {
      if (!processKey) continue

      const plugin = stillMissing.find(p => String(p.address).toLowerCase() === address)
      if (plugin) plugin.processKey = processKey

      // Best-effort persistence to avoid repeating RPC calls.
      await Models.Plugin.updateOne({ network, address }, { $set: { processKey } })
      await Models.ValidatorConfig.updateOne(
        { network, pluginAddress: address },
        {
          $set: {
            id: Models.ValidatorConfig.getEntityId({ network, pluginAddress: address }),
            network,
            pluginAddress: address,
            processKey,
          },
        },
        { upsert: true },
      )
    }
  } catch (error) {
    logger.debug('On-chain processKey backfill skipped', llo({ network, error }))
  }
}

const PluginsController = {
  getInstallationData: async ({ pluginAddress, network }: IPluginExtraParams) => {
    try {
      return await RabbitMQHelper.sendMessage(
        EnumQueueName.pluginInstallationData,
        {
          id: `pluginInstallation-${pluginAddress}-${network}`,
          params: { address: pluginAddress, network },
        },
        { waitResponse: true, timeout: config.RABBITMQ.TIMEOUT },
      )
    } catch (error) {
      logger.warn('Error while getting plugin installation data', llo({ error, pluginAddress, network }))
      throw error
    }
  },
  getPluginsByDao: async (params: IGetPluginsByDaoParams) => {
    try {
      const plugins = await Models.Plugin.findByDaoWithFilters(params)

      const filteredPlugins = await filterPluginsByWhitelist(plugins, params.daoAddress, params.network)

      await backfillHarmonyDelegationProcessKeys({ plugins: filteredPlugins, network: params.network })

      logger.info(
        'Retrieved plugins by DAO',
        llo({
          daoAddress: params.daoAddress,
          network: params.network,
          count: filteredPlugins.length,
          filters: params,
        }),
      )

      return filteredPlugins
    } catch (error) {
      logger.warn('Error while getting plugins by DAO', llo({ error, params }))
      throw error
    }
  },

  getLogPluginSetupProcessor: async (extraParams: ILogPluginSetupProcessorParams) => {
    return await Models.LogPluginSetupProcessor.findOne(extraParams)
  },

  getInstallationHelpers: async ({ pluginAddress, network }: IPluginExtraParams) => {
    logger.info('Looking for plugin installation', llo({ network, pluginAddress }))

    const installation = await Models.LogPluginSetupProcessor.findOne({
      network: network.toLowerCase(),
      pluginAddress: pluginAddress.toLowerCase(),
      event: 'InstallationPrepared',
    })
      .select('helpers transactionHash blockNumber _metadata')
      .lean()

    logger.info(
      'Plugin installation query result',
      llo({
        found: !!installation,
        network,
        pluginAddress,
      }),
    )

    if (!installation) {
      const count = await Models.LogPluginSetupProcessor.countDocuments({
        network: network.toLowerCase(),
        pluginAddress: pluginAddress.toLowerCase(),
      })

      logger.warn(
        'Plugin installation not found',
        llo({
          network,
          pluginAddress,
          totalDocsWithPlugin: count,
        }),
      )

      const error = new Error('Plugin installation not found')
      error.name = 'NotFoundError'
      throw error
    }

    logger.info(
      'Plugin installation helpers retrieved',
      llo({
        network,
        pluginAddress,
        helpersCount: installation.helpers?.length || 0,
        helpers: installation.helpers,
        source: installation._metadata?.source,
      }),
    )

    return {
      helpers: installation.helpers || [],
      metadata: {
        transactionHash: installation.transactionHash,
        blockNumber: installation.blockNumber,
        source: installation._metadata?.source || 'indexer',
      },
    }
  },

  getHarmonyValidatorConfig: async ({ pluginAddress, network }: IPluginExtraParams) => {
    const normalizedPluginAddress = pluginAddress.toLowerCase()
    const networkVariants = [network, String(network).toLowerCase()]

    const cfg = await Models.ValidatorConfig.findOne({
      network: { $in: networkVariants },
      pluginAddress: normalizedPluginAddress,
    })
      .select('validatorAddress processKey lastUpdateTxHash lastUpdateBlock updatedAt createdAt')
      .lean()
      .exec()

    const decodedCfgProcessKey = decodeProcessKey(cfg?.processKey)
    if (cfg?.validatorAddress || decodedCfgProcessKey) {
      return {
        pluginAddress: normalizedPluginAddress,
        network,
        validatorAddress: cfg?.validatorAddress ?? null,
        processKey: decodedCfgProcessKey,
        lastUpdateTxHash: cfg?.lastUpdateTxHash ?? null,
        lastUpdateBlock: cfg?.lastUpdateBlock ?? null,
        updatedAt: cfg?.updatedAt ?? null,
        createdAt: cfg?.createdAt ?? null,
      }
    }

    // Fallback: for DelegationVoting, read config from the plugin contract (best-effort) and persist it.
    try {
      const plugin = await Models.Plugin.findByAddress(normalizedPluginAddress, network)
      if (!plugin || plugin.interfaceType !== IPluginInterfaceType.harmonyDelegationVoting) {
        throw new Error('Not a Harmony Delegation Voting plugin')
      }

      let provider = ProviderModule.getAnyRpcProvider(network)

      // `aragon-api` does not open EnumConnection.BLOCKCHAIN, so ProviderModule may not be initialized.
      // Build a direct JSON-RPC provider from config in that case.
      if (!provider) {
        const networkKey = Utils.networkToAragon(network as any)
        const rpcUrl = (networkKey && config.NODES?.[networkKey]?.ARAGON_RPC) || null
        if (rpcUrl) provider = new JsonRpcProvider(rpcUrl)
      }

      if (!provider) throw new Error('Missing RPC provider')

      const contract = new Contract(
        normalizedPluginAddress,
        ['function validatorAddress() view returns (address)', 'function processKey() view returns (bytes32)'],
        provider,
      )

      const [rawValidator, rawProcessKey] = await Promise.all([
        contract.validatorAddress().catch(() => null),
        contract.processKey().catch(() => null),
      ])

      const validatorAddress =
        rawValidator && rawValidator !== ethers.ZeroAddress ? ethers.getAddress(String(rawValidator)).toLowerCase() : null

      const processKey = (() => {
        if (!rawProcessKey || rawProcessKey === '0x' || rawProcessKey === ethers.ZeroHash) return null
        const raw = String(rawProcessKey)
        if (/^0x[0-9a-fA-F]{64}$/.test(raw)) {
          try {
            return ethers.decodeBytes32String(raw)
          } catch {
            return raw
          }
        }
        return raw
      })()

      if (validatorAddress || processKey) {
        await Models.ValidatorConfig.findOneAndUpdate(
          { network, pluginAddress: normalizedPluginAddress },
          {
            $set: {
              id: Models.ValidatorConfig.getEntityId({ network, pluginAddress: normalizedPluginAddress }),
              network,
              pluginAddress: normalizedPluginAddress,
              ...(validatorAddress ? { validatorAddress } : {}),
              ...(processKey ? { processKey } : {}),
              lastUpdateBlock: plugin.blockNumber,
            },
          },
          { upsert: true, new: true },
        )

        if (processKey) {
          await Models.Plugin.updateOne({ network, address: normalizedPluginAddress }, { $set: { processKey } })
        }
      }

      return {
        pluginAddress: normalizedPluginAddress,
        network,
        validatorAddress,
        processKey,
        lastUpdateTxHash: cfg?.lastUpdateTxHash ?? null,
        lastUpdateBlock: cfg?.lastUpdateBlock ?? null,
        updatedAt: cfg?.updatedAt ?? null,
        createdAt: cfg?.createdAt ?? null,
      }
    } catch (error) {
      logger.debug('Harmony validator config fallback not available', llo({ network, pluginAddress, error }))
    }

    return {
      pluginAddress: normalizedPluginAddress,
      network,
      validatorAddress: cfg?.validatorAddress ?? null,
      processKey: decodedCfgProcessKey,
      lastUpdateTxHash: cfg?.lastUpdateTxHash ?? null,
      lastUpdateBlock: cfg?.lastUpdateBlock ?? null,
      updatedAt: cfg?.updatedAt ?? null,
      createdAt: cfg?.createdAt ?? null,
    }
  },

  getHarmonyValidatorInfo: async ({ validatorAddress, network }: { validatorAddress: string; network: NetworksEnum }) => {
    if (!harmonyNetworks.has(network)) {
      throw new Error(`Harmony validator info is only available on Harmony networks (got ${network})`)
    }

    const service = new HarmonyRpcService({ network })
    const info = await service.getValidatorInformation(validatorAddress)

    return {
      ...info,
      totalDelegation: info.totalDelegation.toString(),
    }
  },

  getHarmonyDelegationsByValidator: async ({
    validatorAddress,
    network,
  }: {
    validatorAddress: string
    network: NetworksEnum
  }) => {
    if (!harmonyNetworks.has(network)) {
      throw new Error(`Harmony delegations are only available on Harmony networks (got ${network})`)
    }

    const service = new HarmonyRpcService({ network })
    const delegations = await service.getDelegationsByValidator(validatorAddress)

    return delegations.map(delegation => ({
      ...delegation,
      amount: delegation.amount.toString(),
      reward: delegation.reward.toString(),
    }))
  },

  getHarmonyDelegationsByDelegator: async ({
    delegatorAddress,
    network,
  }: {
    delegatorAddress: string
    network: NetworksEnum
  }) => {
    if (!harmonyNetworks.has(network)) {
      throw new Error(`Harmony delegations are only available on Harmony networks (got ${network})`)
    }

    const service = new HarmonyRpcService({ network })
    const delegations = await service.getDelegationsByDelegator(delegatorAddress)

    return delegations.map(delegation => ({
      ...delegation,
      amount: delegation.amount.toString(),
      reward: delegation.reward.toString(),
    }))
  },

  getDelegationVotingValidator: async ({
    network,
    pluginAddress,
    page,
    pageSize,
  }: {
    network: NetworksEnum
    pluginAddress: string
    page: number
    pageSize: number
  }) => {
    if (!harmonyNetworks.has(network)) {
      throw new Error(`Delegation voting validator info is only available on Harmony networks (got ${network})`)
    }

    const normalizedNetwork = network.toLowerCase()
    const normalizedPluginAddress = pluginAddress.toLowerCase()

    const cfg = await Models.ValidatorConfig.findOne({
      network: { $in: [network, normalizedNetwork] },
      pluginAddress: normalizedPluginAddress,
    })
      .select('validatorAddress')
      .lean()
      .exec()

    if (!cfg?.validatorAddress) {
      const error = new Error('Validator config not found for plugin')
      error.name = 'NotFoundError'
      throw error
    }

    const service = new HarmonyRpcService({ network })
    const info = await service.getValidatorInformation(cfg.validatorAddress)
    const delegations = await service.getDelegationsByValidator(cfg.validatorAddress)

    const totalVotingPowerRaw = delegations.reduce((acc, d) => acc + (d.amount ?? 0n), 0n)
    const members = paginate(delegations, page, pageSize).map(d => {
      const address = d.delegatorAddress
      const votingPowerRaw = d.amount ?? 0n
      const pendingRewardRaw = d.reward ?? 0n

      return {
        address,
        addressOne: toHarmonyBech32Address(address),
        votingPower: formatUnits(votingPowerRaw, 18),
        votingPowerRaw: votingPowerRaw.toString(),
        pendingReward: formatUnits(pendingRewardRaw, 18),
      }
    })

    return {
      validatorAddress: info.address,
      validatorAddressOne: toHarmonyBech32Address(info.address),
      validatorName: info.name,
      commissionRate: formatCommissionRate(info.rate),
      isActive: info.activeStatus === 'active',
      isInCommittee: info.currentlyInCommittee,
      totalVotingPower: formatUnits(totalVotingPowerRaw, 18),
      totalVotingPowerRaw: totalVotingPowerRaw.toString(),
      membersCount: delegations.length,
      members,
    }
  },

  getDelegationVotingVotingPower: async ({
    network,
    pluginAddress,
    voterAddress,
  }: {
    network: NetworksEnum
    pluginAddress: string
    voterAddress: string
  }) => {
    if (!harmonyNetworks.has(network)) {
      throw new Error(`Delegation voting voting power is only available on Harmony networks (got ${network})`)
    }

    const normalizedNetwork = network.toLowerCase()
    const normalizedPluginAddress = pluginAddress.toLowerCase()

    const cfg = await Models.ValidatorConfig.findOne({
      network: normalizedNetwork,
      pluginAddress: normalizedPluginAddress,
    })
      .select('validatorAddress')
      .lean()
      .exec()

    if (!cfg?.validatorAddress) {
      const error = new Error('Validator config not found for plugin')
      error.name = 'NotFoundError'
      throw error
    }

    const normalizedValidatorHex = toHarmonyHexAddress(cfg.validatorAddress)

    const service = new HarmonyRpcService({ network })
    const delegations = await service.getDelegationsByDelegator(voterAddress)

    const match = delegations.find(d => {
      try {
        return toHarmonyHexAddress(d.validatorAddress) === normalizedValidatorHex
      } catch {
        return false
      }
    })

    const votingPowerRaw = match?.amount ?? 0n
    return {
      votingPower: formatUnits(votingPowerRaw, 18),
      votingPowerRaw: votingPowerRaw.toString(),
      canVote: votingPowerRaw > 0n,
    }
  },
}

// Helper function to check whitelist
async function isDAOWhitelisted(daoAddress: string, network: string, pluginSlug: string): Promise<boolean> {
  if (!harmonyNetworks.has(network as NetworksEnum)) return false

  const allowlistAddress = getAllowlistAddress(pluginSlug)
  if (!allowlistAddress) {
    logger.warn('Missing allowlist contract address', llo({ daoAddress, network, pluginSlug }))
    return false
  }

  const provider = getRpcProvider(network as NetworksEnum)
  if (!provider) {
    logger.warn('Missing RPC provider for allowlist read', llo({ daoAddress, network, pluginSlug }))
    return false
  }

  try {
    const contract = new Contract(allowlistAddress, allowlistReadAbi, provider)
    return await contract.isDAOAllowed(daoAddress)
  } catch (error) {
    logger.warn('Error while checking allowlist contract', llo({ error, daoAddress, network, pluginSlug }))
    return false
  }
}

async function filterPluginsByWhitelist(plugins: any[], daoAddress: string, network: string) {
  const filtered: any[] = []

  for (const plugin of plugins) {
    if ((plugin.slug === 'harmony-hip' || plugin.slug === 'harmony-delegation') && plugin.status === 'by-request') {
      const isAllowed = await isDAOWhitelisted(daoAddress, network, plugin.slug)
      if (!isAllowed) {
        continue
      }

      plugin.status = 'available'
    }

    filtered.push(plugin)
  }

  return filtered
}

export default PluginsController
