import { BaseGovernance } from './baseGovernance'
import { Models } from '@dbModels'
import {
  type HexAddress,
  type IGovernanceParamsOpts,
  type IMemberExtraParams,
  type IMembersResponse,
  type IPaginatedResult,
  type IPaginationParams,
  type NetworksEnum,
} from '@types'
import { Contract, ethers } from 'ethers'
import { HarmonyVotingPlugin } from '@artifacts/HarmonyVotingPlugin'
import ProviderModule from '@modules/provider'
import logger from '@logger'
import Web3Utils from '@helpers/web3Utils'
import { HarmonyRpcService } from '@services/harmonyRpcService'

const llo = logger.logMeta.bind(null, { service: 'governance:HarmonyDelegationGovernance' })

function normalizeAddress(address: string): HexAddress {
  try {
    return ethers.getAddress(address).toLowerCase() as HexAddress
  } catch {
    return address.toLowerCase() as HexAddress
  }
}

function decodeProcessKey(processKey: unknown): string | null {
  if (!processKey) return null

  const raw = String(processKey)
  if (!raw || raw === '0x' || raw === ethers.ZeroHash) return null

  try {
    // If it's bytes32, decode to string and keep it uppercase for consistency.
    return ethers.decodeBytes32String(raw).toUpperCase()
  } catch {
    // If it can't be decoded, preserve the raw value (e.g. hex bytes32)
    return raw
  }
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const safePage = page && page > 0 ? page : 1
  const safePageSize = pageSize && pageSize > 0 ? pageSize : 10
  const start = (safePage - 1) * safePageSize
  return items.slice(start, start + safePageSize)
}

/**
 * Governance implementation for Harmony validator-delegation based plugins.
 *
 * Members are derived from Harmony staking delegations (delegators of the configured validator).
 * This governance is read-only: add/remove/update member is not supported.
 */
export class HarmonyDelegationGovernance extends BaseGovernance {
  async getOrCreate(memberAddress: HexAddress, params?: IGovernanceParamsOpts): Promise<any> {
    const parsedAddress = Web3Utils.parseAddress(memberAddress)
    if (!parsedAddress) return null

    // Best-effort: ensure base member exists for ENS/avatar enrichment.
    try {
      await BaseGovernance.ensureBaseMember(parsedAddress, params?.lastActivity)
      return await Models.Member.findByAddress(parsedAddress)
    } catch {
      return await Models.Member.findByAddress(parsedAddress)
    }
  }

  async create(memberAddress: HexAddress, params: IGovernanceParamsOpts): Promise<any> {
    return this.getOrCreate(memberAddress, params)
  }

  async update(_memberAddress: HexAddress, _params: IGovernanceParamsOpts): Promise<any> {
    void _memberAddress
    void _params
    throw new Error('Update not supported for Harmony delegation governance')
  }

  async delete(_memberAddress: HexAddress): Promise<boolean> {
    void _memberAddress
    // Membership is derived from on-chain staking, not persisted.
    return false
  }

  async findOne(memberAddress: HexAddress): Promise<any> {
    const parsedAddress = Web3Utils.parseAddress(memberAddress)
    if (!parsedAddress) return null
    return Models.Member.findByAddress(parsedAddress)
  }

  async updateDaoMetrics(): Promise<void> {
    // No-op: metrics are maintained by other indexers.
  }

  private async ensureValidatorConfig(): Promise<{ validatorAddress: HexAddress | null; processKey: string | null }> {
    const normalizedPluginAddress = normalizeAddress(this.address)
    const normalizedNetwork = String(this.network).toLowerCase() as NetworksEnum

    const existing = await Models.ValidatorConfig.findOne({
      network: normalizedNetwork,
      pluginAddress: normalizedPluginAddress,
    })
      .select('validatorAddress processKey')
      .lean()
      .exec()

    if (existing?.validatorAddress && existing?.processKey) {
      return {
        validatorAddress: (existing.validatorAddress ? normalizeAddress(existing.validatorAddress) : null) as any,
        processKey: existing.processKey ?? null,
      }
    }

    // Best-effort on-chain fallback.
    try {
      const provider = ProviderModule.getProvider(normalizedNetwork)
      const contract = new Contract(normalizedPluginAddress, HarmonyVotingPlugin.abi, provider)

      let validatorAddress: HexAddress | null = existing?.validatorAddress
        ? normalizeAddress(existing.validatorAddress)
        : null
      let processKey: string | null = existing?.processKey ?? null

      try {
        const v = await contract.validatorAddress()
        if (v) validatorAddress = normalizeAddress(String(v))
      } catch {
        // ignore
      }

      if (!processKey) {
        try {
          const k = await contract.processKey()
          processKey = decodeProcessKey(k)
        } catch {
          // ignore
        }
      }

      if (validatorAddress || processKey) {
        await Models.ValidatorConfig.findOneAndUpdate(
          { network: normalizedNetwork, pluginAddress: normalizedPluginAddress },
          {
            $set: {
              id: Models.ValidatorConfig.getEntityId({ network: normalizedNetwork, pluginAddress: normalizedPluginAddress }),
              network: normalizedNetwork,
              pluginAddress: normalizedPluginAddress,
              ...(validatorAddress ? { validatorAddress } : {}),
              ...(processKey ? { processKey } : {}),
            },
          },
          { upsert: true, new: true },
        )

        if (processKey) {
          await Models.Plugin.updateOne(
            { network: normalizedNetwork, address: normalizedPluginAddress },
            { $set: { processKey } },
          )
        }
      }

      return { validatorAddress: validatorAddress ?? null, processKey }
    } catch (error) {
      logger.warn('Failed to backfill validator config from chain', llo({ network: this.network, pluginAddress: this.address, error }))
      return {
        validatorAddress: (existing?.validatorAddress ? normalizeAddress(existing.validatorAddress) : null) as any,
        processKey: existing?.processKey ?? null,
      }
    }
  }

  async findAndPaginateMembers(params: {
    paginationParams?: IPaginationParams
    extraParams?: IMemberExtraParams
  }): Promise<IPaginatedResult<IMembersResponse>> {
    const { paginationParams = {}, extraParams = {} } = params

    const page = paginationParams.page ?? 1
    const pageSize = paginationParams.pageSize ?? 10

    const plugin = await Models.Plugin.findByAddress(this.address, this.network)
    const daoAddress = (extraParams.daoAddress ?? plugin?.daoAddress ?? ethers.ZeroAddress).toLowerCase() as HexAddress
    const tokenAddress = (extraParams.tokenAddress ?? plugin?.tokenAddress ?? ethers.ZeroAddress).toLowerCase() as HexAddress
    const pluginSubdomain = (plugin?.subdomain ?? '') as string

    const { validatorAddress } = await this.ensureValidatorConfig()
    if (!validatorAddress) {
      return {
        metadata: {
          page,
          pageSize,
          totalPages: 0,
          totalRecords: 0,
        },
        data: [],
      }
    }

    const service = new HarmonyRpcService({ network: this.network })
    const delegations = await service.getDelegationsByValidator(validatorAddress)

    // Sort by amount desc, then address for deterministic pagination.
    const sorted = delegations
      .map(d => ({
        delegatorAddress: normalizeAddress(d.delegatorAddress),
        amount: d.amount ?? 0n,
      }))
      .sort((a, b) => {
        if (a.amount === b.amount) return a.delegatorAddress.localeCompare(b.delegatorAddress)
        return a.amount > b.amount ? -1 : 1
      })

    const totalRecords = sorted.length
    const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageSize)
    const pageItems = paginate(sorted, page, pageSize)

    const addresses = [...new Set(pageItems.map(i => i.delegatorAddress))]
    const members = await Models.Member.find({ address: { $in: addresses } })
      .select('address ens firstActivity lastActivity')
      .lean()
      .exec()

    const memberByAddress = new Map<string, any>()
    for (const m of members) memberByAddress.set(String(m.address).toLowerCase(), m)

    const data: IMembersResponse[] = pageItems.map(item => {
      const member = memberByAddress.get(item.delegatorAddress.toLowerCase())

      return {
        network: this.network,
        address: item.delegatorAddress,
        ens: (member?.ens ?? null) as any,
        pluginSubdomain,
        pluginAddress: normalizeAddress(this.address),
        tokenAddress,
        daoAddress,
        votingPower: item.amount.toString(),
        tokenBalance: item.amount.toString(),
        currentDelegate: null,
        metrics: {
          firstActivity: member?.firstActivity ?? undefined,
          lastActivity: member?.lastActivity ?? undefined,
          delegateReceivedCount: 0,
          voteCount: 0,
          proposalCount: 0,
        },
      }
    })

    return {
      metadata: {
        page,
        pageSize,
        totalPages,
        totalRecords,
      },
      data,
    }
  }
}
