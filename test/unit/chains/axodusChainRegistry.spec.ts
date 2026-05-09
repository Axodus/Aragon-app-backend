import { expect } from 'chai'
import { axodusChainRegistry } from '@src/chains'
import { IPluginInterfaceType, NetworksEnum } from '@types'

describe('Chains:AxodusChainRegistry', () => {
  it('returns the EVM core and Harmony legacy entries', () => {
    const networks = axodusChainRegistry.all().map(chain => chain.network)

    expect(networks).to.include(NetworksEnum.ethereumSepolia)
    expect(networks).to.include(NetworksEnum.ethereumMainnet)
    expect(networks).to.include(NetworksEnum.baseMainnet)
    expect(networks).to.include(NetworksEnum.arbitrumMainnet)
    expect(networks).to.include(NetworksEnum.polygonMainnet)
    expect(networks).to.include(NetworksEnum.harmonyMainnet)
  })

  it('marks Sepolia as the PoC execution chain and keeps Harmony out of execution role', () => {
    const executionChains = axodusChainRegistry.byRole('execution').map(chain => chain.network)
    const sepolia = axodusChainRegistry.byNetwork(NetworksEnum.ethereumSepolia)
    const harmony = axodusChainRegistry.byNetwork(NetworksEnum.harmonyMainnet)

    expect(executionChains).to.deep.equal([NetworksEnum.ethereumSepolia])
    expect(sepolia?.chainId).to.equal(11155111)
    expect(sepolia?.adapter).to.equal('evm')
    expect(sepolia?.capabilities.remoteExecution).to.equal(true)
    expect(harmony?.legacyHarmonyAdapter).to.equal(true)
    expect(harmony?.roles).to.not.include('execution')
  })

  it('filters supported networks by slug, network enum, or config key', () => {
    const filtered = axodusChainRegistry
      .supportedNetworks(['ethereum-sepolia', NetworksEnum.baseMainnet, 'ARBITRUM_MAINNET'])
      .map(chain => chain.network)

    expect(filtered).to.deep.equal([
      NetworksEnum.ethereumSepolia,
      NetworksEnum.baseMainnet,
      NetworksEnum.arbitrumMainnet,
    ])
  })

  it('exposes plugin capabilities per chain', () => {
    expect(
      axodusChainRegistry.isSupportedPlugin(NetworksEnum.ethereumSepolia, IPluginInterfaceType.nativeTokenVoting),
    ).to.equal(true)
    expect(
      axodusChainRegistry.isSupportedPlugin(NetworksEnum.ethereumSepolia, IPluginInterfaceType.harmonyVoting),
    ).to.equal(false)
    expect(
      axodusChainRegistry.isSupportedPlugin(NetworksEnum.harmonyMainnet, IPluginInterfaceType.harmonyVoting),
    ).to.equal(true)
  })

  it('exposes action-level plugin capability metadata', () => {
    const tokenVoting = axodusChainRegistry.pluginCapability(
      NetworksEnum.ethereumSepolia,
      IPluginInterfaceType.tokenVoting,
    )
    const harmonyVoting = axodusChainRegistry.pluginCapability(
      NetworksEnum.harmonyMainnet,
      IPluginInterfaceType.harmonyVoting,
    )

    expect(tokenVoting?.actions.vote).to.equal(true)
    expect(tokenVoting?.actions.execute).to.equal(true)
    expect(tokenVoting?.executionModes).to.include('federal')
    expect(harmonyVoting?.legacy).to.equal(true)
    expect(harmonyVoting?.votingPowerStrategy).to.equal('harmony-validator-snapshot')
  })
})
