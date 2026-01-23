import { Contract, ZeroAddress, getAddress, keccak256, toUtf8Bytes } from 'ethers'
import { NetworksEnum } from '@types'
import BottleneckModule from '@modules/bottleneck'
import ProviderModule from '@modules/provider'
import config from '@config'
import logger from '@logger'

const llo = logger.logMeta.bind(null, { service: 'helper:NameResolver' })

const REGISTRY_ABI = ['function resolver(bytes32 node) external view returns (address)']
const RESOLVER_ABI = ['function addr(bytes32 node) external view returns (address)']

const namehash = (name: string): string => {
  let node = '0x0000000000000000000000000000000000000000000000000000000000000000'

  if (name) {
    const labels = name.split('.')
    for (let i = labels.length - 1; i >= 0; i--) {
      const labelHash = keccak256(toUtf8Bytes(labels[i]))
      node = keccak256(Buffer.concat([Buffer.from(node.slice(2), 'hex'), Buffer.from(labelHash.slice(2), 'hex')]))
    }
  }

  return node
}

const NameResolver = {
  isSupportedName(value: string): boolean {
    return /\.(eth|country)$/i.test(value)
  },

  async resolveNameToAddress(name: string, network: NetworksEnum): Promise<string | null> {
    if (!NameResolver.isSupportedName(name)) return null

    const isEth = /\.eth$/i.test(name)
    const isCountry = /\.country$/i.test(name)

    try {
      if (isEth) {
        const provider = ProviderModule.getAnyRpcProvider(NetworksEnum.ethereumMainnet)
        if (!provider) return null

        const limiter = BottleneckModule.getAlchemyENSLimiter(NetworksEnum.ethereumMainnet)
        return await NameResolver._resolveWithRegistry({
          name,
          registryAddress: config.CONTRACTS.ENS_REGISTRY,
          provider,
          schedule: async fn => await limiter.schedule(fn),
        })
      }

      if (isCountry) {
        const registryAddress = NameResolver._getCountryRegistryForNetwork(network)
        if (!registryAddress) return null

        const provider = ProviderModule.getAnyRpcProvider(network)
        if (!provider) return null

        const limiter = BottleneckModule.getNodeLimiter(network)
        return await NameResolver._resolveWithRegistry({
          name,
          registryAddress,
          provider,
          schedule: async fn => await limiter.schedule(fn),
        })
      }

      return null
    } catch (error) {
      logger.silly('Erro ao resolver nome', llo({ name, network, error }))
      return null
    }
  },

  _getCountryRegistryForNetwork(network: NetworksEnum): string | null {
    if (network === NetworksEnum.harmonyMainnet) return config.CONTRACTS.COUNTRY_REGISTRY.HARMONY_MAINNET
    if (network === NetworksEnum.harmonyTestnet) return config.CONTRACTS.COUNTRY_REGISTRY.HARMONY_TESTNET
    return null
  },

  async _resolveWithRegistry({
    name,
    registryAddress,
    provider,
    schedule,
  }: {
    name: string
    registryAddress: string
    provider: any
    schedule: <T>(fn: () => Promise<T>) => Promise<T>
  }): Promise<string | null> {
    const node = namehash(name)

    const registry = new Contract(registryAddress, REGISTRY_ABI, provider)
    const resolverAddress = await schedule(async () => registry.resolver(node))

    if (!resolverAddress || resolverAddress === ZeroAddress) return null

    const resolver = new Contract(resolverAddress, RESOLVER_ABI, provider)

    let resolvedAddress: string
    try {
      resolvedAddress = await schedule(async () => resolver.addr(node))
    } catch (error) {
      logger.silly('Erro ao consultar addr() no resolver', llo({ name, resolverAddress, error }))
      return null
    }

    if (!resolvedAddress || resolvedAddress === ZeroAddress) return null

    try {
      return getAddress(resolvedAddress)
    } catch {
      return null
    }
  },
}

export default NameResolver
