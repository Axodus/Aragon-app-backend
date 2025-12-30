import { Contract, type Provider, formatUnits } from 'ethers'
import config from '@config'
import logger from '@logger'
import ProviderModule from '@modules/provider'
import { NetworksEnum } from '@types'

const llo = logger.logMeta.bind(null, { service: 'helpers:BandOracle' })

const BAND_STD_REFERENCE_ABI = [
  {
    inputs: [
      { internalType: 'string', name: 'base', type: 'string' },
      { internalType: 'string', name: 'quote', type: 'string' },
    ],
    name: 'getReferenceData',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'rate', type: 'uint256' },
          { internalType: 'uint256', name: 'lastUpdatedBase', type: 'uint256' },
          { internalType: 'uint256', name: 'lastUpdatedQuote', type: 'uint256' },
        ],
        internalType: 'struct IStdReference.ReferenceData',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

interface BandReferenceData {
  rate: bigint
  lastUpdatedBase: bigint
  lastUpdatedQuote: bigint
}

const BandOracle = {
  getAdapterAddress(network: NetworksEnum): string | null {
    if (network === NetworksEnum.harmonyMainnet) {
      return config.BAND?.HARMONY_MAINNET?.ADAPTER_ADDRESS || null
    }

    return null
  },

  getProvider(network: NetworksEnum): Provider | null {
    const provider = ProviderModule.getAnyRpcProvider(network)
    return provider || null
  },

  isStale(referenceData: BandReferenceData, nowSeconds: number, maxStalenessSeconds: number): boolean {
    const lastUpdatedBase = Number(referenceData.lastUpdatedBase)
    const lastUpdatedQuote = Number(referenceData.lastUpdatedQuote)

    if (!lastUpdatedBase || !lastUpdatedQuote) return true

    return nowSeconds - lastUpdatedBase > maxStalenessSeconds || nowSeconds - lastUpdatedQuote > maxStalenessSeconds
  },

  async getSpotPriceUsd({
    network,
    baseSymbol,
  }: {
    network: NetworksEnum
    baseSymbol: string
  }): Promise<string | null> {
    const adapterAddress = BandOracle.getAdapterAddress(network)

    if (!adapterAddress) {
      logger.warn('Band adapter address not configured for network', llo({ network }))
      return null
    }

    const provider = BandOracle.getProvider(network)
    if (!provider) {
      logger.warn('No RPC provider available for network', llo({ network }))
      return null
    }

    const maxStalenessSeconds = config.BAND?.MAX_STALENESS_SECONDS ?? 4 * 60 * 60

    try {
      const nowSeconds = Math.floor(Date.now() / 1000)
      const oracle = new Contract(adapterAddress, BAND_STD_REFERENCE_ABI, provider)

      const referenceData: BandReferenceData = await oracle.getReferenceData(baseSymbol.toUpperCase(), 'USD')

      if (BandOracle.isStale(referenceData, nowSeconds, maxStalenessSeconds)) {
        logger.warn(
          'Band oracle data is stale',
          llo({
            network,
            baseSymbol,
            lastUpdatedBase: referenceData.lastUpdatedBase.toString(),
            lastUpdatedQuote: referenceData.lastUpdatedQuote.toString(),
            maxStalenessSeconds,
          }),
        )
        return null
      }

      // Band returns rate scaled by 1e18
      return formatUnits(referenceData.rate, 18)
    } catch (error) {
      logger.warn('Error fetching Band oracle price', llo({ network, baseSymbol, error }))
      return null
    }
  },
}

export default BandOracle
