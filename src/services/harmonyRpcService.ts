import logger from '@logger'
import HarmonyRpc from '@helpers/harmonyRpc'
import type { NetworksEnum } from '@types'
import { toHarmonyBech32Address, toHarmonyHexAddress } from '../utils/harmonyAddressUtils'

const llo = logger.logMeta.bind(null, { service: 'services:HarmonyRpcService' })

export interface ValidatorInfo {
  address: string
  name: string
  rate: string
  totalDelegation: bigint
  activeStatus: string
  currentlyInCommittee: boolean
}

export interface Delegation {
  validatorAddress: string
  delegatorAddress: string
  amount: bigint
  reward: bigint
}

interface CacheEntry<T> {
  expiresAt: number
  value: T
}

export class HarmonyRpcService {
  private readonly network: NetworksEnum
  private readonly cacheTtlMs: number
  private readonly cache = new Map<string, CacheEntry<unknown>>()

  constructor(params: { network: NetworksEnum; cacheTtlMs?: number }) {
    this.network = params.network
    this.cacheTtlMs = params.cacheTtlMs ?? 30_000
  }

  private async cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const now = Date.now()
    const cached = this.cache.get(key)
    if (cached && cached.expiresAt > now) {
      return cached.value as T
    }

    const value = await fetcher()
    this.cache.set(key, { value, expiresAt: now + this.cacheTtlMs })
    return value
  }

  private toBigInt(value: unknown): bigint {
    try {
      if (typeof value === 'bigint') return value
      if (typeof value === 'number') return BigInt(Math.trunc(value))
      if (typeof value === 'string' && value.length > 0) return BigInt(value)
      return 0n
    } catch {
      return 0n
    }
  }

  async getValidatorInformation(validatorAddress: string): Promise<ValidatorInfo> {
    const bech32Address = toHarmonyBech32Address(validatorAddress)

    return this.cached(`validator:${bech32Address}`, async () => {
      try {
        const result = await HarmonyRpc.getValidatorInformation(bech32Address, this.network)
        const validator = result?.validator ?? {}

        return {
          address: toHarmonyHexAddress(validator?.address ?? bech32Address),
          name: validator?.name || 'Unknown Validator',
          rate: validator?.rate ?? '0',
          totalDelegation: this.toBigInt(result?.['total-delegation'] ?? '0'),
          activeStatus: result?.['active-status'] ?? 'unknown',
          currentlyInCommittee: Boolean(result?.['currently-in-committee']),
        }
      } catch (error) {
        logger.error('Error getValidatorInformation', llo({ network: this.network, validatorAddress, error }))
        throw error
      }
    })
  }

  async getDelegationsByValidator(validatorAddress: string): Promise<Delegation[]> {
    const bech32Address = toHarmonyBech32Address(validatorAddress)

    return this.cached(`delegations:validator:${bech32Address}`, async () => {
      try {
        const result = await HarmonyRpc.getDelegationsByValidator(bech32Address, this.network)

        return result.map((delegation: any) => ({
          validatorAddress: toHarmonyHexAddress(delegation?.validator_address ?? bech32Address),
          delegatorAddress: toHarmonyHexAddress(delegation?.delegator_address ?? '0x0000000000000000000000000000000000000000'),
          amount: this.toBigInt(delegation?.amount ?? '0'),
          reward: this.toBigInt(delegation?.reward ?? '0'),
        }))
      } catch (error) {
        logger.error('Error getDelegationsByValidator', llo({ network: this.network, validatorAddress, error }))
        throw error
      }
    })
  }

  async getDelegationsByDelegator(delegatorAddress: string): Promise<Delegation[]> {
    const bech32Address = toHarmonyBech32Address(delegatorAddress)

    return this.cached(`delegations:delegator:${bech32Address}`, async () => {
      try {
        const result = await HarmonyRpc.getDelegationsByDelegator(bech32Address, this.network)

        return result.map((delegation: any) => ({
          validatorAddress: toHarmonyHexAddress(delegation?.validator_address ?? '0x0000000000000000000000000000000000000000'),
          delegatorAddress: toHarmonyHexAddress(delegation?.delegator_address ?? bech32Address),
          amount: this.toBigInt(delegation?.amount ?? '0'),
          reward: this.toBigInt(delegation?.reward ?? '0'),
        }))
      } catch (error) {
        logger.error('Error getDelegationsByDelegator', llo({ network: this.network, delegatorAddress, error }))
        throw error
      }
    })
  }
}
